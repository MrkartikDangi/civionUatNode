const db = require("../config/db")

const Schedule = () => { }

Schedule.getScheduleData = (postData) => {
  return new Promise((resolve, reject) => {
    let whereCondition = ``
    if (postData.filter && postData.filter.schedule_id) {
      whereCondition += `And ks.id = ${postData.filter.schedule_id}`
    }
    let query = `SELECT ks.*, IFNULL(DATE_FORMAT(ks.created_at, '%Y-%m-%d %H:%i:%s'), '') AS created_at, IFNULL(DATE_FORMAT(ks.updated_at, '%Y-%m-%d %H:%i:%s'), '') AS updated_at, IFNULL(CONCAT('${process.env.Base_Url}', ks.folder_name, '/', ks.pdfUrl), '') AS pdfUrl, IFNULL(inv.description, '') AS invoiceDescription FROM kps_schedules ks LEFT JOIN (SELECT ki.schedule_id, ki.description FROM kps_invoice ki INNER JOIN (SELECT schedule_id, MAX(created_at) AS max_created FROM kps_invoice GROUP BY schedule_id) latest ON latest.schedule_id = ki.schedule_id AND latest.max_created = ki.created_at) inv ON ks.id = inv.schedule_id WHERE 1 = 1 ${whereCondition}`
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

Schedule.addScheduleData = (postData) => {
  return new Promise((resolve, reject) => {
    let insertedData = {
      project_name: postData.project_name,
      project_number: postData.project_number,
      owner: postData.owner,
      description: postData.description || '',
      pdfUrl: postData.path,
      rate: postData.rate,
      invoice_to: postData.invoice_to,
      folder_name: postData.folder_name,
      created_at: postData.user.dateTime,
      created_by: postData.user.userId
    }
    let query = `INSERT INTO ?? SET ?`
    let values = ['kps_schedules', insertedData]
    db.connection.query(query, values, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}
Schedule.updateScheduleData = (postData) => {
  return new Promise((resolve, reject) => {
    let updatedData = {
      project_name: postData.project_name,
      project_number: postData.project_number,
      owner: postData.owner,
      description: postData.description || '',
      pdfUrl: postData.pdfUrl,
      rate: postData.rate,
      invoice_to: postData.invoice_to,
      folder_name: postData.folder_name,
      updated_at: postData.user.dateTime,
      updated_by: postData.user.userId
    }
    let query = `UPDATE ?? SET ? WHERE id = ?`
    let values = ['kps_schedules', updatedData, postData.id]
    db.connection.query(query, values, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}
Schedule.deleteScheduleData = (postData) => {
  return new Promise((resolve, reject) => {
    let query = `DELETE FROM ?? WHERE id = ?`
    let values = ['kps_schedules', postData.id]
    db.connection.query(query, values, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}




module.exports = Schedule;
