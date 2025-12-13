
const db = require("../config/db")
const moment = require('moment')

let Logs = () => {}

Logs.addLogs = (postData) => {
  return new Promise((resolve, reject) => {
    let insertedValues = {
        user_id: postData.userId,
        api_endpoint: postData.api_endpoint,
        request_payload: postData.request_payload,
        response_payload: postData.response_payload,
        created_at: postData.dateTime
    }
    let query = `INSERT INTO ?? SET ?`
    let values = ['kps_logs', insertedValues]
    db.connection.query(query, values, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}
Logs.updateLogs = (postData) => {
  return new Promise((resolve, reject) => {
    let updatedValues = {
        response_payload: postData.response_payload
    }
    let query = `UPDATE ?? SET ? WHERE id = ?`
    let values = ['kps_logs', updatedValues,postData.id]
    db.connection.query(query, values, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}
module.exports = Logs

