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
    if (!req.body.id) {
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
    } else {
      let updatedData = {
        schedule_id: req.body.schedule_id,
        selected_date: req.body.selectedDate,
        location: req.body.location,
        on_shore: req.body.onShore,
        temp_high: req.body.tempHigh,
        temp_low: req.body.tempLow,
        weather: req.body.weather,
        working_day: req.body.workingDay,
        report_number: req.body.reportNumber,
        contract_number: req.body.contractNumber,
        contractor: req.body.contractor,
        site_inspector: req.body.siteInspector,
        time_in: req.body.timeIn,
        time_out: req.body.timeOut,
        totalHours: req.body.totalHours,
        owner_contact: req.body.ownerContact,
        owner_project_manager: req.body.ownerProjectManager,
        contract_number: req.body.contractNumber,
        component: req.body.component,
        description: req.body.description,
        logo: req.body.logo ? req.body.logo.join(',') : null,
        signature: req.body.signature,
        pdfName: req.body.pdfName,
        declerationFrom: req.body.declerationFrom ? JSON.stringify(req.body.declerationFrom) : null,
        form_completed: req.body?.form_completed ?? 0,
        updated_at: req.body.user.dateTime
      }
      let updatedResult = await generic.updateData('kps_daily_entry', updatedData, { id: req.body.id })
      if (updatedResult) {
        let dailyEntryId = req.body.id
        if (req.body.equipments && req.body.equipments.length) {
          await generic.deleteData({ table_name: "kps_daily_entry_equipments", column_name: "daily_entry_id", id: dailyEntryId })
          for (let row of req.body.equipments) {
            row.userId = req.body.user.userId
            row.dateTime = req.body.user.dateTime
            row.dailyEntryId = dailyEntryId
            await dailyEntry.addEquipmentsData(row)
          }
        }
        if (req.body.visitors && req.body.visitors.length) {
          await generic.deleteData({ table_name: "kps_daily_entry_visitors", column_name: "daily_entry_id", id: dailyEntryId })
          for (let row of req.body.visitors) {
            row.userId = req.body.user.userId
            row.dateTime = req.body.user.dateTime
            row.dailyEntryId = dailyEntryId
            await dailyEntry.addVisitorsData(row)
          }
        }

        if (req.body.labours && req.body.labours.length) {
          let labourData = await generic.selectData('kps_daily_entry_labours', { daily_entry_id: dailyEntryId }, ['id'])
          let ids = labourData.map(item => item.id);
          await generic.deleteData({ table_name: "kps_daily_entry_labours", column_name: "daily_entry_id", id: dailyEntryId })
          for (let row of req.body.labours) {
            row.userId = req.body.user.userId
            row.dateTime = req.body.user.dateTime
            row.dailyEntryId = dailyEntryId
            let addLabourData = await dailyEntry.addLaboursData(row)
            if (row.roles.length && addLabourData.insertId) {
              if (ids.length) {
                await dailyEntry.deleteLabourRoleData(ids)
              }
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
          await generic.deleteData({ table_name: "kps_daily_entry_photofiles", column_name: "daily_entry_id", id: dailyEntryId })
          for (let row of req.body.photoFiles) {
            row.userId = req.body.user.userId
            row.dateTime = req.body.user.dateTime
            row.dailyEntryId = dailyEntryId
            await dailyEntry.addPhotoFilesData(row)
          }
        }
        db.connection.commit()
        return generic.success(req, res, {
          message: "Daily entry successfully updated",
        });

      } else {
        db.connection.rollback()
        return generic.error(req, res, {
          message: "Failed to update daily entry",
        });
      }
    }

  } catch (error) {
    console.log('error', error)
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
    return generic.error(req, res, {
      status: 500,
      message: "something went wrong!",
    });
  }
};
