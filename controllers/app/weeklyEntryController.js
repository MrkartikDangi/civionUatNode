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
    console.log('error', error)
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
      return generic.error(req, res, { message: "schedule does'nt exists" });
    }
    if (!req.body.id) {
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
    } else {
      let updatedData = {
        schedule_id: req.body.schedule_id,
        weekStartDate: req.body.startDate ? req.body.startDate : null,
        weekEndDate: req.body.endDate ? req.body.endDate : null,
        reportDate: req.body.reportDate ? req.body.reportDate: null,
        contractNumber: req.body.contractNumber || null,
        projectManager: req.body.projectManager || null,
        consultantProjectManager: req.body.consultantProjectManager || null,
        contractProjectManager: req.body.contractProjectManager || null,
        contractorSiteSupervisorOnshore: req.body.contractorSiteSupervisorOnshore || null,
        contractorSiteSupervisorOffshore: req.body.contractorSiteSupervisorOffshore || null,
        siteInspector: req.body.siteInspector.length ? req.body.siteInspector.join(',') : null,
        cityProjectManager: req.body.cityProjectManager || null,
        inspectorTimeIn: req.body.inspectorTimeIn || null,
        inspectorTimeOut: req.body.inspectorTimeOut || null,
        contractAdministrator: req.body.contractAdministrator || null,
        supportCA: req.body.supportCA || null,
        component: req.body.component || null,
        logo: req.body.logo ? req.body.logo.join(',') : null,
        signature: req.body.signature || null,
        pdfName: req.body.pdfName || null,
        weeklyAllList: req.body.weeklyAllList && Object.keys(req.body.weeklyAllList).length ? JSON.stringify(req.body.weeklyAllList) : '',
        form_completed: req.body?.form_completed ?? 0,
        updated_at: req.body.user.dateTime,
        updated_by: req.body.user.userId
      }
      let updatedWeeklyData = await generic.updateData('kps_weekly_entry', updatedData, { id: req.body.id })
      if (updatedWeeklyData) {
        if (req.body.photoFiles && req.body.photoFiles.length) {
          await generic.deleteData({ table_name: "kps_weekly_entry_photofiles", column_name: "weekly_entry_id", id: req.body.id })
          for (let row of req.body.photoFiles) {
            row.userId = req.body.user.userId
            row.dateTime = req.body.user.dateTime
            row.weeklyEntryId = req.body.id
            await weeklyEntry.addPhotoFilesData(row)
          }
        }
        db.connection.commit()
        return generic.success(req, res, {
          message: "Weekly entry updated successfully.",
        });
      } else {
        db.connection.rollback()
        return generic.error(req, res, {
          message: "Failed to update weekly entry",
        });

      }

    }
  } catch (error) {
    console.log('error',error)
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

