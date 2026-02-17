const generic = require("../../config/genricFn/common");
const { validationResult, matchedData } = require("express-validator");
const Schedule = require("../../models/scheduleModel")
const dailyDiary = require("../../models/dailyDiaryModel");
const dailyEntry = require("../../models/dailyEntryModel");
const path = require("path");
const moment = require("moment");
const fs = require("fs");
const { dailyDiaryTemplate } = require("../../utils/pdfHandlerNew/htmlHandler");
const db = require("../../config/db")

exports.getDailyDiary = async (req, res) => {
  try {
    const dailyDiaries = await dailyDiary.getDailyDiary(req.body);
    return generic.success(req, res, {
      message: "Daily Diary entries retrieved successfully.",
      data: dailyDiaries,
    });
  } catch (error) {
    return generic.error(req, res, {
      status: 500,
      message: "Something went wrong !"
    });
  }
};

exports.createDailyDiary = async (req, res) => {
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
    let getScheduleData = await Schedule.getScheduleData({ filter: { schedule_id: req.body.schedule_id } })
    if (!getScheduleData.length) {
      return generic.validationError(req, res, { message: "schedule does'nt exists" });
    }
    const existingDailyEntry = await dailyEntry.getDailyEntry({ filter: { userId: req.body.user.userId, schedule_id: req.body.schedule_id, selectedDate: req.body.selectedDate } })
    if (existingDailyEntry.length) {
      db.connection.rollback()
      return generic.error(req, res, {
        message: `You have already submitted a daily entry for this project on this date ${moment(req.body.selectedDate).format("DD-MMM-YYYY")}.`,
      });
    }
    let existingDailyDiary = await dailyDiary.getDailyDiary({ filter: { userId: req.body.user.userId, schedule_id: req.body.schedule_id, selectedDate: req.body.selectedDate } });
    if (existingDailyDiary.length) {
      db.connection.rollback()
      return res.status(400).json({
        message: `You have already submitted a daily diary for this project on this date ${moment(req.body.selectedDate).format("DD-MMM-YYYY")}.`,

      });

    }
    const newDailyDiary = await dailyDiary.createDailyDiary(req.body);
    if (newDailyDiary.insertId) {
      db.connection.commit()
      return generic.success(req, res, {
        message: "Daily Diary created successfully.",
        data: {
          id: newDailyDiary.insertId
        }
      });

    } else {
      db.connection.rollback()
      return generic.error(req, res, {
        message: "Failed to create daily diary",
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
