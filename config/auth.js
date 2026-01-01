const generic = require("./genricFn/common")
const User = require("../models/userModel")
const moment = require('moment-timezone');
const apiLogs = require("../models/logsModel")

module.exports = {
  authenticateJWT: async (req, res, next) => {
    try {
      if (req.header("Authorization") == undefined) {
        return generic.error(req, res, {
          status: 403,
          message: "Access denied. Authorization key is missing in headers.",
        });
      }
      const token = req.header("Authorization").split(" ")[1];
      if (!token) {
        return generic.error(req, res, {
          status: 403,
          message: "Access denied. Token missing.",
        });
      }
      let authVerification = await generic.jwtVerify(token, process.env.JWT_SECRET)
      if (authVerification.status) {
        let addLog = {
          api_endpoint: req.url,
          request_payload: JSON.stringify(req.body),
          dateTime: req.header("dateTime") ? req.header("dateTime") : moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss')
        }
        req.body.user = authVerification.data.userDetails
        let getUserDetails = await User.checkExistingUser({ filter: { userId: req.body.user.userId } })
        if (getUserDetails.length) {
          addLog.userId = req.body.user.userId
          let result = await apiLogs.addLogs(addLog)
          req.body.user.log_id = result?.insertId
          req.body.user.isBoss = getUserDetails[0]?.is_boss == '1' ? true : false
          req.body.user.jhaApproval = getUserDetails[0]?.jhaApproval == '1' ? true : false
          req.body.user.latitude = getUserDetails[0]?.latitude
          req.body.user.longitude = getUserDetails[0]?.longitude
          req.body.user.first_name = getUserDetails[0]?.firstName ?? ''
          req.body.user.last_name = getUserDetails[0]?.lastName ?? ''
          req.body.user.username = getUserDetails[0]?.username
          req.body.user.dateTime = req.header("dateTime") ? req.header("dateTime") : moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss')
        }
        next();

      }
      // req.body.user.dateTime = req.header("dateTime") ? moment.utc(req.header("dateTime")).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss') : moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss')
    } catch (error) {
      return generic.error(req, res, {
        status: 403,
        message: 'Invalid token. Token has expired.',
      });
    }

  },
  isBoss: function isBoss(req, res, next) {
    if (!req.body.user.isBoss) {
      return generic.error(req, res, {
        status: 403,
        message: "Access restricted to authorized managers.",
      });
    }
    next();
  },
};
