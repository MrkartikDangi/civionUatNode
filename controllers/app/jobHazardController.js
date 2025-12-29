const JobHazard = require("../../models/jobHazardModel");
const generic = require("../../config/genricFn/common");
const { validationResult, matchedData } = require("express-validator");
const db = require("../../config/db")
const oneDrive = require("../../models/oneDriveModel")
const notification = require("../../models/Notification")
const {
  JobHazardTemplate,
} = require("../../utils/pdfHandlerNew/htmlHandler");
const fs = require("fs");
const User = require("../../models/userModel")


exports.getJobHazardData = async (req, res) => {
  try {
    if (!req.body.user.isBoss) {
      req.body.filter.userId = req.body.user.userId
    }
    const data = await JobHazard.getJobHazardData(req.body);
    return generic.success(req, res, {
      message: "Job Hazard data retrieved successfully.",
      data: data,
    });
  } catch (error) {
    return generic.error(req, res, {
      status: 500,
      message: "Something went wrong !"
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
      let notificationData = {
        subject: 'Job Hazard',
        message: `${req.body.user.username} has submitted the Job Hazard Analysis`,
        for_boss: '1',
        created_by: req.body.user.userId,
        dateTime: req.body.user.dateTime
      }
      await notification.addNotificationData(notificationData)
      let getMailInfo = await generic.getEmailInfo({ module_type: 'job_hazard' })
      let getJhaApprovalUserMail = await User.checkExistingUser({ filter: { jhaApproval: '1' } })
      let approvalMail = ``
      if (getJhaApprovalUserMail?.length) {
        approvalMail = getJhaApprovalUserMail[0]?.email
      }

      let Maildata = {
        to: getMailInfo?.email_to ?? '',
        cc: `${getMailInfo?.email_cc ?? ''},${approvalMail}`,
        bcc: getMailInfo?.email_bcc ?? '',
        subject: `Review the submitted JHA`,
        html: JobHazardTemplate({ message: `Please review the submitted JHA by ${req.body.user.username} in the CIVION.` }),
        attachments: [],
      };
      await generic.sendEmails(Maildata)
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
        message: "Failed to submit job hazard data",
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
exports.updateJobHazard = async (req, res) => {
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
    const updateJobHazardData = await JobHazard.updateJobHazardData(req.body)
    if (updateJobHazardData.affectedRows) {
      if (req.body.selectedActivities && req.body.selectedActivities.length) {
        await generic.deleteData({ table_name: 'kps_jobHazardActvity', column_name: 'job_hazard_id', id: req.body.id })
        for (let row of req.body.selectedActivities) {
          row.userId = req.body.user.userId
          row.jobHazardId = req.body.id
          row.dateTime = req.body.user.dateTime
          await JobHazard.addActivityData(row)
        }
      }
      if (req.body.tasks && req.body.tasks.length) {
        await generic.deleteData({ table_name: 'kps_jobHazardTasks', column_name: 'job_hazard_id', id: req.body.id })
        for (let row of req.body.tasks) {
          row.userId = req.body.user.userId
          row.jobHazardId = req.body.id
          row.dateTime = req.body.user.dateTime
          await JobHazard.addTaskData(row)
        }
      }
      db.connection.commit()
      return generic.success(req, res, {
        message: "Job Hazard data updated successfully.",
      });

    } else {
      db.connection.rollback()
      return generic.error(req, res, {
        message: "Failed to update job hazard data",
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
exports.sendJhaMail = async (req, res) => {
  try {
    if (req?.files && req.files?.file?.length) {
      let getMailInfo = await generic.getEmailInfo({ module_type: 'job_hazard' })
      let getJhaApprovalUserMail = await User.checkExistingUser({ filter: { jhaApproval: '1' } })
      let approvalMail = ``
      if (getJhaApprovalUserMail?.length) {
        approvalMail = getJhaApprovalUserMail[0]?.email
      }
      let Maildata = {
        to: getMailInfo?.email_to ?? '',
        cc: `${getMailInfo?.email_cc ?? ''},${approvalMail}`,
        bcc: getMailInfo?.email_bcc ?? '',
        subject: `JHA by ${req.body.user.username}`,
        html: JobHazardTemplate({ message: `Please find the attached Job Hazard Analysis PDF report for your review and reference.` }),
        attachments: [
          {
            filename: req?.files?.file[0]?.originalname || "Job_Hazard_Report.pdf",
            path: req?.files?.file[0]?.path,
            contentType: "application/pdf",
          },
        ],
      };
      let result = await generic.sendEmails(Maildata)
      if (result) {
        fs.unlinkSync(req?.files?.file[0]?.path)
        return generic.success(req, res, {
          message: "Job Hazard mail sent successfully."
        });

      } else {
        return generic.error(req, res, {
          message: "Failed to send jha mail.",
        });

      }

    } else {
      return generic.error(req, res, {
        message: "Select atleast one file",
      });
    }

  } catch (error) {
    return generic.error(req, res, {
      status: 500,
      message: "Something went wrong !"
    });
  }
};
