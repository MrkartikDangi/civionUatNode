const generic = require("../../config/genricFn/common");
const { validationResult, matchedData } = require("express-validator");
const PhotoFiles = require("../../models/photoFileModel");
const moment = require("moment");
const path = require("path");
const db = require("../../config/db");
const Schedule = require("../../models/scheduleModel");


exports.uploadAttachement = async (req, res) => {
  try {
    if (
      req.files &&
      req.files.file &&
      Array.isArray(req.files.file) &&
      req.files.file.length > 0
    ) {

      let data = {
        fileData: req.files.file,
        type: req.body.type,
      };
      let result = await generic.uploadAttachment(data);
      if (result.status) {
        generic.success(req, res, {
          message: result.message,
          data: result.result,
        });
      } else {
        generic.error(req, res, { message: result.message });
      }
    } else {
      generic.error(req, res, {
        message: "Please provide image for uploadation",
      });
    }
  } catch (error) {
    return generic.error(req, res, {
      status: 500,
      message: "Something went wrong !"
    });
  }
};

exports.deleteAttachemnts = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const x = matchedData(req);
    return generic.validationError(req, res, {
      message: "Needs to fill required input fields",
      validationObj: errors.mapped(),
    });
  }
  try {
    let path = req.body.path;
    const s3DeleteResult = await generic.deleteAttachmentFromS3(path);
    if (s3DeleteResult?.status) {
      generic.success(req, res, { message: s3DeleteResult.message });
    } else {
      generic.error(req, res, { message: s3DeleteResult.message });
    }
  } catch (error) {
    return generic.error(req, res, {
      status: 500,
      message: "Something went wrong !"
    });
  }
};

exports.getPhotoFiles = async (req, res) => {
  try {
    const getPhotoFilesData = await PhotoFiles.getPhotoFilesData(req.body);
    return generic.success(req, res, {
      message: "photofiles data retrieved successfully.",
      data: getPhotoFilesData,
    });
  } catch (error) {
    return generic.error(req, res, {
      status: 500,
      message: "Something went wrong !"
    });
  }
};
exports.getPhotoFilesByUserId = async (req, res) => {
  try {
    const photos = await PhotoFiles.getPhotoFilesData({ filter: { userId: req.body.user.userId } });
    return generic.success(req, res, {
      message: "photofiles data retrieved successfully.",
      data: photos,
    });
  } catch (error) {
    return generic.error(req, res, {
      status: 500,
      message: "Something went wrong !"
    });
  }
};
exports.createPhotoFiles = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const x = matchedData(req);
    return generic.validationError(req, res, {
      message: "Needs to fill required input fields",
      validationObj: errors.mapped(),
    });
  }
  try {
    db.connection.beginTransaction()
    if (req.body.imageurl && req.body.imageurl.length) {
      await generic.initializeOneDrive()
      let getScheduleData = await Schedule.getScheduleData({ filter: { schedule_id: req.body.schedule_id } })
      for (let row of req.body.imageurl) {
        row.schedule_id = req.body.schedule_id
        row.userId = req.body.user.userId
        row.dateTime = req.body.user.dateTime
        row.fileName = path.basename(row.path);
        row.folder_name = path.dirname(row.path);
        await PhotoFiles.addPhotoFileData(row)
        let data = {
          filePath: `${process.env.Base_Url}${row.folder_name}/${row.fileName}`,
          fileName: row.fileName,
          folderPath: `civion/${getScheduleData[0]?.project_name ?? 'DefaultProject'}/photoFiles`
        }
        await generic.uploadFileToOneDrive(data)
      }
      db.connection.commit()
      return generic.success(req, res, {
        message: "Photos Added Successfully."
      });
    } else {
      db.connection.rollback()
      return generic.error(req, res, {
        message: `Provide image for uploadation`
      });

    }
  } catch (error) {
    console.log('error', error)
    db.connection.rollback()
    return generic.error(req, res, {
      status: 500,
      message: "Something went wrong !"
    });
  }
};
exports.deletePhotoFiles = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const x = matchedData(req);
    return generic.validationError(req, res, {
      message: "Needs to fill required input fields",
      validationObj: errors.mapped(),
    });
  }
  try {
    db.connection.beginTransaction()
    if (req.body.photoFileId && req.body.photoFileId.length) {
      for (let row of req.body.photoFileId) {
        const checkImageExists = await PhotoFiles.getPhotoFilesData({ filter: { id: row } });
        if (!checkImageExists.length) {
          db.connection.rollback()
          return generic.error(req, res, {
            message: "Image doesn't exist",
            details: checkImageExists,
          });
        }
        const dbDeleteResult = await PhotoFiles.deletePhotoFiles({ id: row });
        if (dbDeleteResult.affectedRows) {
          let fileUrl = `${checkImageExists[0].folder_name}/${checkImageExists[0].file_url}`;
          await generic.deleteAttachmentFromS3(fileUrl);

        }

      }
      db.connection.commit()
      return generic.success(req, res, {
        message: "Image successfully deleted",
      });

    } else {
      db.connection.rollback()
      return generic.error(req, res, {
        message: "Provide image details for deletation",
      });

    }

  } catch (error) {
    db.connection.rollback()
    return generic.error(req, res, {
      status: 500,
      message: "Something went wrong !"
    });
  }
};
