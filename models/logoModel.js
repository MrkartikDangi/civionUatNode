const db = require("../config/db")
const moment = require('moment')

const Logo = () => { }

Logo.getLogosList = (postData) => {
  return new Promise((resolve, reject) => {
    let whereCondition = ``
    if (postData.filter && postData.filter.logoid) {
      whereCondition += ` AND id = ${postData.filter.logoid}`
    }
    let query = `SELECT kps_logos.*, IFNULL(DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s'), '') AS created_at,IFNULL(DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s'), '') AS updated_at,IFNULL(CONCAT('${process.env.Base_Url}',folder_name,'/', logoUrl), '') as file_url FROM kps_logos WHERE is_active = ? ${whereCondition}`
    let values = ['1']
    db.connection.query(query, values, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}
Logo.addLogos = (postData) => {
  return new Promise((resolve, reject) => {
    let insertedValues = {
      companyName: postData.companyName ?? 'default',
      folder_name: postData.folder_name ?? 'default',
      logoUrl: postData.logoUrl ?? 'Unknown URL',
      is_active: '1',
      created_by: postData.userId,
      created_at: postData.dateTime
    }
    let query = `INSERT INTO ?? SET ?`
    let values = ['kps_logos', insertedValues]
    db.connection.query(query, values, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}
Logo.editLogo = (postData) => {
  return new Promise((resolve, reject) => {
    let updatedValues = {
      companyName: postData.companyName ?? 'default',
      folder_name: postData.folder_name ?? 'default',
      logoUrl: postData.logoUrl ?? 'Unknown URL',
      is_active: '1',
      updated_at: postData.dateTime,
      updated_by: postData.userId
    }
    let query = `UPDATE ?? SET ? WHERE id = ?`
    let values = ['kps_logos', updatedValues, postData.id]
    db.connection.query(query, values, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}
Logo.deleteLogo = (postData) => {
  return new Promise((resolve, reject) => {
    let query = `DELETE FROM ?? WHERE id = ?`
    let values = ['kps_logos', postData.id]
    db.connection.query(query, values, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}
Logo.getBannersList = (postData) => {
  return new Promise((resolve, reject) => {
    let query = `SELECT kb.name,kb.image_path,kb.created_at,kb.updated_at,kb.folder_name,kb.is_active, IFNULL(DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s'), '') AS created_at,IFNULL(DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s'), '') AS updated_at,IFNULL(CONCAT('${process.env.Base_Url}',folder_name,'/', image_path), '') as image_path FROM kps_banner as kb WHERE is_active = ? ORDER BY ordering ASC`
    let values = ['1']
    db.connection.query(query, values, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}







module.exports = Logo;
