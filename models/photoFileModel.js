const db = require("../config/db")
const moment = require('moment')

const PhotoFiles = () => { }

PhotoFiles.getPhotoFilesData = (postData) => {
  let whereCondition = ``
  if (postData.filter && postData.filter.userId) {
    whereCondition += ` AND userId = ${postData.filter.userId}`
  }
  if (postData.filter && postData.filter.id) {
    whereCondition += ` AND id IN (${postData.filter.id})`
  }
  if (postData.filter && postData.filter.schedule_id) {
    whereCondition += ` AND schedule_id = '${postData.filter.schedule_id}'`
  }
    if (postData.filter && postData.filter.fromDate  && postData.filter.toDate) {
    whereCondition += ` AND DATE(created_at) BETWEEN '${postData.filter.fromDate}' AND '${postData.filter.toDate}'`
  }
  return new Promise((resolve, reject) => {
    let query = `SELECT kps_photofiles_doc.*, IFNULL(DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s'), '') AS created_at,IFNULL(DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s'), '') AS updated_at,IFNULL(CONCAT('${process.env.Base_Url}',folder_name,'/', file_url), '') as file_url FROM kps_photofiles_doc WHERE 1 = 1 ${whereCondition}`
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
PhotoFiles.addPhotoFileData = (postData) => {
  return new Promise((resolve, reject) => {
    let insertedData = {
      userId: postData.userId,
      schedule_id: postData.schedule_id,
      file_url: postData.fileName,
      folder_name: postData.folder_name,
      description: postData.description || '',
      created_by: postData.userId,
      created_at: postData.dateTime
    }
    let query = `INSERT INTO ?? SET ?`
    let values = ["kps_photofiles_doc", insertedData]
    db.connection.query(query, values, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}
PhotoFiles.deletePhotoFiles = (postData) => {
  return new Promise((resolve, reject) => {
    let query = `DELETE FROM kps_photofiles_doc WHERE id = ?`
    let values = [postData.id]
    db.connection.query(query, values, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}


module.exports = PhotoFiles;
