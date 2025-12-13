const Logo = require("../../models/logoModel");
const generic = require("../../config/genricFn/common");
const { validationResult, matchedData } = require("express-validator");
const path = require("path");
const db = require("../../config/db")
const moment = require("moment")

exports.getLogoList = async (req, res) => {
  try {
    const logos = await Logo.getLogosList(req.body);
    return generic.success(req, res, {
      message: "logos list.",
      data: logos,
    });
  } catch (error) {
    return generic.error(req, res, {
      status: 500,
      message: "something went wrong!",
    });
  }
};
exports.addLogo = async (req, res) => {
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
    let logoUrl = path.basename(req.body.fileUrl);
    let folder_name = path.dirname(req.body.fileUrl);
    const newLogo = await Logo.addLogos({ schedule_id: req.body.schedule_id, companyName: req.body.companyName, folder_name: folder_name, logoUrl: logoUrl, userId: req.body.user.userId, dateTime: req.body.user.dateTime });
    if (newLogo.insertId) {
      db.connection.commit()
      return generic.success(req, res, {
        message: "logo is successfully added.",
        data: {
          id: newLogo.insertId
        }
      });
    } else {
      db.connection.rollback()
      return generic.error(req, res, {
        message: "failed to add logo",
      });
    }
  } catch (error) {
    db.connection.rollback()
    return generic.error(req, res, {
      status: 500,
      message: "something went wrong!",
    });
  }
};
exports.editLogo = async (req, res) => {
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
    let getLogosList = await Logo.getLogosList({ filter: { logoid: req.body.id, schedule_id: req.body.schedule_id } })
    if (!getLogosList.length) {
      db.connection.rollback()
      return generic.error(req, res, {
        message: "Logo details not found",
      });

    }
    let url = `${process.env.Base_Url}/${getLogosList[0]?.folder_name}/${getLogosList[0]?.logoUrl}`
    await generic.deleteAttachmentFromS3(url)

    let logoUrl = path.basename(req.body.fileUrl);
    let folder_name = path.dirname(req.body.fileUrl);
    const editLogo = await Logo.editLogo({ companyName: req.body.companyName, folder_name: folder_name, logoUrl: logoUrl, id: req.body.id, schedule_id: req.body.schedule_id, userId: req.body.user.userId, dateTime: req.body.user.dateTime });
    if (editLogo.affectedRows) {
      db.connection.commit()
      return generic.success(req, res, {
        message: "logo updated successfully",
        data: {
          id: req.body.id,
          path: `${process.env.Base_Url}/${folder_name}/${logoUrl}`
        }
      });
    } else {
      db.connection.rollback()
      return generic.error(req, res, {
        message: "failed to update logo",
      });
    }
  } catch (error) {
    db.connection.rollback()
    return generic.error(req, res, {
      status: 500,
      message: "something went wrong!",
    });
  }
};
exports.deleteLogo = async (req, res) => {
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
    let getLogosList = await Logo.getLogosList({ filter: { logoid: req.body.id } })
    if (!getLogosList.length) {
      db.connection.rollback()
      return generic.error(req, res, {
        message: "Logo details not found",
      });

    }
    const deleteLogo = await Logo.deleteLogo(req.body);
    if (deleteLogo.affectedRows) {
      let url = `${process.env.Base_Url}/${getLogosList[0]?.folder_name}/${getLogosList[0]?.logoUrl}`
      await generic.deleteAttachmentFromS3(url)
      db.connection.commit()
      return generic.success(req, res, {
        message: "logo is successfully deleted.",
      });
    } else {
      db.connection.rollback()
      return generic.error(req, res, {
        message: "failed to add logo",
      });
    }
  } catch (error) {
    db.connection.rollback()
    return generic.error(req, res, {
      status: 500,
      message: "something went wrong!",
    });
  }
};
