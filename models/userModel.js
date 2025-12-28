const db = require("../config/db")
const moment = require('moment')

var User = () => { }

User.checkExistingUser = (postData) => {
  let whereCondition = ``
  if (postData.filter && postData.filter.userId) {
    whereCondition += ` AND id = ${postData.filter.userId}`
  }
  if (postData.filter && postData.filter.email) {
    whereCondition += ` AND email = '${postData.filter.email}'`
  }
  if (postData.filter && postData.filter.username) {
    whereCondition += ` AND username = '${postData.filter.username}'`
  }
  if (postData.filter && postData.filter.password) {
    whereCondition += ` AND password = '${postData.filter.password}'`
  }
    if (postData.filter && postData.filter.jhaApproval) {
    whereCondition += ` AND jhaApproval = '${postData.filter.jhaApproval}'`
  }
  return new Promise((resolve, reject) => {
    let query = `SELECT * FROM kps_users WHERE 1 = 1 ${whereCondition}`
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
User.addUserDetails = (postData) => {
  return new Promise((resolve, reject) => {
    let insertedValues = {
      email: postData.email,
      mileage_rate: postData.mileageRate,
      allowanceDistance: postData.allowanceDistance || 0,
      is_boss: postData.isBoss || false,
      created_at: postData.user.dateTime,
      created_by: postData.user.userId
    }
    let query = `INSERT INTO ?? SET ?`
    let values = ['kps_users', insertedValues]
    db.connection.query(query, values, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}
User.updateUserDetails = (postData) => {
  return new Promise((resolve, reject) => {
    let updatedValues = {
      password: postData.password,
      username: postData.username,
      updated_at: postData.dateTime,
    }
    let query = `UPDATE ?? SET ? WHERE id = ? AND email = ?`
    let values = ['kps_users', updatedValues, postData.id, postData.email]
    db.connection.query(query, values, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}
User.updateUserLocation = (postData) => {
  return new Promise((resolve, reject) => {
    let updatedValues = {
      latitude: postData.latitude,
      longitude: postData.longitude,
      updated_at: postData.dateTime,
      updated_by: postData.userId

    }
    let query = `UPDATE ?? SET ? WHERE id = ?`
    let values = ['kps_users', updatedValues, postData.userId]
    db.connection.query(query, values, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}
User.updateCodeDetails = (postData) => {
  return new Promise((resolve, reject) => {
    let updatedValues = {
      verificationCode: postData.verificationCode,
      codeExpiration: postData.codeExpiration,
      updated_at: postData.dateTime,
      updated_by: postData.id

    }
    let query = `UPDATE ?? SET ? WHERE id = ?`
    let values = ['kps_users', updatedValues, postData.id]
    db.connection.query(query, values, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}
User.getUserPasswordDetails = (postData) => {
  return new Promise((resolve, reject) => {
    let query = `SELECT * FROM kps_users WHERE password = ?`
    let values = [postData.currentPassword]
    db.connection.query(query, values, (err, res) => {
      if (err) {
        reject(err)
      } else {
        let data = {}
        if (res.length) {
          data = res[0]
        }
        resolve(data)
      }
    })
  })
}
User.updateUserPassword = (postData) => {
  return new Promise((resolve, reject) => {
    let updatedValues = {
      password: postData.password,
      updated_by: postData.id,
      updated_at: postData.dateTime
    }
    let query = `UPDATE ?? SET ? WHERE id = ?`
    let values = ['kps_users', updatedValues, postData.id]
    db.connection.query(query, values, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}
User.updateBossPermission = (postData) => {
  return new Promise((resolve, reject) => {
    let updatedValues = {
      is_boss: postData.is_boss,
      updated_at: postData.user.dateTime,
      updated_by: postData.user.userId
    }
    let query = `UPDATE ?? SET ? WHERE id = ?`
    let values = ['kps_users', updatedValues, postData.user.userId]
    db.connection.query(query, values, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}

module.exports = User;
