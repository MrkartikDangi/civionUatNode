const db = require("../config/db")
const moment = require("moment")

const oneDrive = () => {}

oneDrive.getValidOneDriveToken = (postData) => {
  return new Promise((resolve, reject) => {
    let query = `SELECT access_token FROM kps_oneDriveToken WHERE expires_at > NOW() ORDER BY created_at DESC LIMIT 1`
    let values = []
    db.connection.query(query, values, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}

oneDrive.saveOneDriveToken = (postData) => {
  return new Promise((resolve, reject) => {
    let insertedValues = {
      access_token: postData.access_token,
      expires_at: moment.utc().add(postData.expires_in, 'seconds').tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'),
      created_at: moment.utc(new Date()).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss')
    }
    let query = `INSERT INTO ?? SET ?`
    let values = ['kps_oneDriveToken', insertedValues]
    db.connection.query(query, values, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}

oneDrive.deleteOneDriveExpiredToken = (postData) => {
  return new Promise((resolve, reject) => {
    let query = `DELETE FROM kps_oneDriveToken WHERE expires_at <= NOW()`
    let values = []
    db.connection.query(query, values, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}

module.exports = oneDrive