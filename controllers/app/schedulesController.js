const Schedule = require("../../models/scheduleModel");

const fs = require("fs");
const Notification = require("../../models/Notification");
const generic = require("../../config/genricFn/common");
const { validationResult, matchedData } = require("express-validator");
const path = require("path");
const axios = require("axios");
const moment = require("moment");
const db = require("../../config/db")

exports.getScheduleData = async (req, res) => {
  try {
    const schedulesData = await Schedule.getScheduleData(req.body)
    return generic.success(req, res, {
      message: "Schedule data reterived successfully",
      data: schedulesData,
    });
  } catch (error) {
    console.log('error', error)
    return generic.error(req, res, {
      status: 500,
      message: "Something went wrong !"
    });
  }
};

exports.addScheduleData = async (req, res) => {
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
    req.body.path = path.basename(req.body.pdfUrl);
    req.body.folder_name = path.dirname(req.body.pdfUrl);
    const addSchedule = await Schedule.addScheduleData(req.body)
    if (addSchedule.insertId) {
      db.connection.commit()
      return generic.success(req, res, {
        message: "Schedule Data Added successfully",
        data: {
          id: addSchedule.insertId
        }
      });
    } else {
      db.connection.rollback()
      return generic.error(req, res, {
        message: "Failed to add schedule data",
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
exports.updateScheduleData = async (req, res) => {
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
    const getScheduleData = await Schedule.getScheduleData({ filter: { schedule_id: req.body.id } })
    if (!getScheduleData.length) {
      db.connection.rollback()
      return generic.success(req, res, {
        message: "schedule details not found"
      });
    }
    let url = `${process.env.Base_Url}/${getScheduleData[0]?.folder_name}/${getScheduleData[0]?.pdfUrl}`
    await generic.deleteAttachmentFromS3(url)

    req.body.pdfUrl = path.basename(req.body.pdfUrl);
    req.body.folder_name = path.dirname(req.body.pdfUrl);
    const updateScheduleData = await Schedule.updateScheduleData(req.body)
    if (updateScheduleData.affectedRows) {
      db.connection.commit()
      return generic.success(req, res, {
        message: "Schedule data updated successfully",
      });
    } else {
      db.connection.rollback()
      return generic.error(req, res, {
        message: "Failed to update schedule data",
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
exports.deleteScheduleData = async (req, res) => {
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
    const getScheduleData = await Schedule.getScheduleData({ filter: { schedule_id: req.body.id } })
    if (!getScheduleData.length) {
      db.connection.rollback()
      return generic.success(req, res, {
        message: "schedule details not found"
      });
    }
    const deleteScheduleData = await Schedule.deleteScheduleData(req.body)
    if (deleteScheduleData.affectedRows) {
      let url = `${process.env.Base_Url}/${getScheduleData[0]?.folder_name}/${getScheduleData[0]?.pdfUrl}`
      await generic.deleteAttachmentFromS3(url)
      db.connection.commit()
      return generic.success(req, res, {
        message: "Schedule data deleted successfully"
      });
    } else {
      db.connection.rollback()
      return generic.success(req, res, {
        message: "Failed to delete schedule data"
      });

    }

  } catch (error) {
    console.log('errro',error)
    db.connection.rollback()
    return generic.error(req, res, {
      status: 500,
      message: "Something went wrong !"
    });
  }
};

