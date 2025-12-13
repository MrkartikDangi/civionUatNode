const JobHazard = require("../../models/jobHazardModel");
const generic = require("../../config/genricFn/common");
const { validationResult, matchedData } = require("express-validator");
const db = require("../../config/db")
const oneDrive = require("../../models/oneDriveModel")

exports.getJobHazardData = async (req, res) => {
  try {
    const data = await JobHazard.getJobHazardData(req.body);
    return generic.success(req, res, {
      message: "Job Hazard data retrieved successfully.",
      data: data,
    });
  } catch (error) {
    return generic.error(req, res, {
      message: "Error getting job hazard data",
      details: error.message,
    });
  }
};

exports.createJobHazard = async (req, res) => {
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
    const addJobHazardData = await JobHazard.addJobHazardData(req.body)
    if (addJobHazardData.insertId) {
      if (req.body.selectedActivities && req.body.selectedActivities.length) {
        for (let row of req.body.selectedActivities) {
          row.userId = req.body.user.userId
          row.jobHazardId = addJobHazardData.insertId
          row.dateTime = req.body.user.dateTime
          await JobHazard.addActivityData(row)
        }
      }
      if (req.body.tasks && req.body.tasks.length) {
        for (let row of req.body.tasks) {
          row.userId = req.body.user.userId
          row.jobHazardId = addJobHazardData.insertId
          row.dateTime = req.body.user.dateTime
          await JobHazard.addTaskData(row)
        }
      }
      db.connection.commit()
      return generic.success(req, res, {
        message: "Job Hazard data submitted successfully.",
        data: {
          id: addJobHazardData.insertId
        },
      });

    } else {
      db.connection.rollback()
      return generic.error(req, res, {
        message: "Job Hazard data submitted successfully.",
      });

    }

  } catch (error) {
    db.connection.rollback()
    return generic.error(req, res, {
      status: 500,
      message: "Something went wrong.",
    });
  }
};
