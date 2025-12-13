const generic = require("../../config/genricFn/common");
const { validationResult, matchedData } = require("express-validator");
const Schedule = require("../../models/scheduleModel");
const dailyEntry = require("../../models/dailyEntryModel");
const dailyDiary = require("../../models/dailyDiaryModel");
const fs = require("fs");
const db = require("../../config/db")


exports.createDailyEntry = async (req, res) => {
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
    const existingDailyEntry = await dailyEntry.getDailyEntry({ filter: { userId: req.body.user.userId, schedule_id: req.body.schedule_id, selectedDate: req.body.selectedDate } });
    const existingDailyDiary = await dailyDiary.getDailyDiary({ filter: { userId: req.body.user.userId, schedule_id: req.body.schedule_id, selectedDate: req.body.selectedDate } });

    if (existingDailyEntry.length) {
      db.connection.rollback()
      return res.status(400).json({
        message:
          "You have already submitted a daily entry for this project on this date.",
      });
    }
    if (existingDailyDiary.length) {
      db.connection.rollback()
      return res.status(400).json({
        message:
          "You have already submitted a daily diary for this project on this date.",
      });
    }
    const createDailyEntry = await dailyEntry.createDailyEntry(req.body)
    if (createDailyEntry.insertId) {
      let dailyEntryId = createDailyEntry.insertId
      if (req.body.equipments && req.body.equipments.length) {
        for (let row of req.body.equipments) {
          row.userId = req.body.user.userId
          row.dateTime = req.body.user.dateTime
          row.dailyEntryId = dailyEntryId
          await dailyEntry.addEquipmentsData(row)
        }
      }
      if (req.body.visitors && req.body.visitors.length) {
        for (let row of req.body.visitors) {
          row.userId = req.body.user.userId
          row.dateTime = req.body.user.dateTime
          row.dailyEntryId = dailyEntryId
          await dailyEntry.addVisitorsData(row)
        }
      }
      if (req.body.labours && req.body.labours.length) {
        for (let row of req.body.labours) {
          row.userId = req.body.user.userId
          row.dateTime = req.body.user.dateTime
          row.dailyEntryId = dailyEntryId
          let addLabourData = await dailyEntry.addLaboursData(row)
          if (row.roles.length && addLabourData.insertId) {
            for (let x of row.roles) {
              x.userId = req.body.user.userId
              x.dateTime = req.body.user.dateTime
              x.labour_id = addLabourData.insertId
              await dailyEntry.addLaboursRoleData(x)
            }
          }
        }
      }
      if (req.body.photoFiles && req.body.photoFiles.length) {
        for (let row of req.body.photoFiles) {
          row.userId = req.body.user.userId
          row.dateTime = req.body.user.dateTime
          row.dailyEntryId = dailyEntryId
          await dailyEntry.addPhotoFilesData(row)
        }
      }
      db.connection.commit()
      return generic.success(req, res, {
        message: "Daily entry successfully created",
        data: {
          id: createDailyEntry.insertId
        }
      });

    } else {
      db.connection.rollback()
      return generic.error(req, res, {
        message: "Failed to create daily entry",
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
exports.getDailyEntry = async (req, res) => {
  try {
    const dailyEntries = await dailyEntry.getDailyEntry(req.body);
    return generic.success(req, res, {
      message: "Daily entries retrieved successfully.",
      data: dailyEntries,
    });
  } catch (error) {
    console.log(error)
    return generic.error(req, res, {
      status: 500,
      message: "something went wrong!",
    });
  }
};
