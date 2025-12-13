const db = require("../config/db")
const moment = require("moment")

const notification = () => { }


notification.getNotificationsList = (postData) => {
  return new Promise((resolve, reject) => {
    let whereCondition = ``
    let values
    if (!postData.user.isBoss) {
      whereCondition += ` AND userid = ${postData.user.userId} AND for_boss = ?`
      values = ['0']
    } else {
      whereCondition += ` AND for_boss = ?`
      values = ['1']
    }
    let query = `SELECT id,subject,message,is_read,IFNULL(DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s'), '') AS created_at FROM kps_notifications WHERE 1 = 1 ${whereCondition} ORDER BY id DESC`
    db.connection.query(query, values, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}

notification.addNotificationData = (postData) => {
  return new Promise((resolve, reject) => {
    let insertedValues = {
      userid: postData.userid,
      subject: postData.subject,
      message: postData.message,
      for_boss: postData.for_boss || '0',
      created_by: postData.created_by,
      created_at: postData.dateTime
    }
    let query = `INSERT INTO ?? SET ?`
    let values = ['kps_notifications', insertedValues]
    db.connection.query(query, values, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}
notification.updateNotificationStatus = (postData) => {
  return new Promise((resolve, reject) => {
    let insertedValues = {
      is_read: 1,
      updated_at: postData.user.dateTime
    }
    let query = `UPDATE ?? SET ? WHERE id IN (${postData.id})`
    let values = ['kps_notifications', insertedValues]
    db.connection.query(query, values, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}

module.exports = notification