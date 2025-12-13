const Notification = require("../../models/Notification");
const generic = require("../../config/genricFn/common");
const { validationResult, matchedData } = require("express-validator");


exports.getNotifications = async (req, res) => {
  try {
    const data = await Notification.getNotificationsList(req.body);
    return generic.success(req, res, {
      message: "Notification data retrieved successfully.",
      data: data,
    });
  } catch (error) {
    return generic.error(req, res, {
      status: 500,
      message: "something went wrong!",
    });
  }
};
exports.updateNotificationStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const x = matchedData(req);
    return generic.validationError(req, res, {
      message: "Needs to fill required input fields",
      validationObj: errors.mapped(),
    });
  }
  try {
    req.body.id = req.body.id.join(',')
    const updateNotificationStatus = await Notification.updateNotificationStatus(req.body);
    if (updateNotificationStatus.affectedRows) {
      return generic.success(req, res, {
        message: "Notification Status updated successfully.",
      });
    } else {
      return generic.error(req, res, {
        message: "Failed to update notification status.",
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
