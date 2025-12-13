const generic = require("../../config/genricFn/common");
const { validationResult, matchedData } = require("express-validator");
const dailyEntry = require("../../models/dailyEntryModel");
const dailyDiary = require("../../models/dailyDiaryModel");
const weeklyEntry = require("../../models/weeklyEntryModel");
const schedule = require("../../models/scheduleModel")
const User = require("../../models/userModel")
const db = require("../../config/db")
const path = require("path")
const photoFiles = require("../../models/photoFileModel")



exports.getWeeklyReport = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const x = matchedData(req);
    return generic.validationError(req, res, {
      message: "Needs to fill required input fields",
      validationObj: errors.mapped(),
    });
  }
  try {
    let weeklyList = await weeklyEntry.getWeeklyEntry(req.body)
    if (weeklyList.length) {
      return generic.success(req, res, {
        message: "Weekly report list.",
        data: weeklyList,
      });

    } else {
      return generic.success(req, res, {
        message: "No user has uploaded their weekly report."
      });

    }
  } catch (error) {
    return generic.error(req, res, {
      status: 500,
      message: "something went wrong!",
    });
  }
};
exports.createWeeklyEntry = async (req, res) => {
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
    const getScheduleData = await schedule.getScheduleData({ filter: { schedule_id: req.body.schedule_id } })
    if (!getScheduleData) {
      return generic.error(req, res, { message: "Invalid schedule ID, schedule not found" });
    }
    const user = await User.checkExistingUser({ userId: req.body.user.userId });
    if (!user.length) {
      return generic.error(req, res, { message: "User not found" });
    }
    const createWeeklyEntry = await weeklyEntry.createWeeklyEntry(req.body)
    if (createWeeklyEntry.insertId) {
      let weeklyEntryId = createWeeklyEntry.insertId
      if (req.body.photoFiles && req.body.photoFiles.length) {
        for (let row of req.body.photoFiles) {
          row.userId = req.body.user.userId
          row.dateTime = req.body.user.dateTime
          row.weeklyEntryId = weeklyEntryId
          await weeklyEntry.addPhotoFilesData(row)
        }
      }
      db.connection.commit()
      return generic.success(req, res, {
        message: "Weekly entry created successfully.",
        data: {
          id: weeklyEntryId,
        },
      });
    } else {
      db.connection.rollback()
      return generic.error(req, res, {
        message: "Failed to add weekly entry",
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

exports.getDailyDiaryAndEntryUserDetails = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const x = matchedData(req);
    return generic.validationError(req, res, {
      message: "Needs to fill required input fields",
      validationObj: errors.mapped(),
    });
  }
  try {
    let getDailyDiary = await dailyDiary.getDailyDiary(req.body)
    let getDailyEntry = await dailyEntry.getDailyEntry(req.body)
    return generic.success(req, res, {
      message: "Daily diary and Daily entry details",
      data: {
        dailyDiary: getDailyDiary,
        dailyEntry: getDailyEntry
      }
    });
  } catch (error) {
    return generic.error(req, res, {
      status: 500,
      message: "something went wrong!",
    });
  }
};

