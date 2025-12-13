const db = require("../config/db")
const moment = require('moment')

const dailyEntry = () => { }

dailyEntry.getDailyEntry = (postData) => {
  return new Promise((resolve, reject) => {
    let whereCondition = ``
    if (postData.filter && postData.filter.userId) {
      whereCondition += ` AND userId = ${postData.filter.userId}`
    }
    if (postData.filter && postData.filter.schedule_id) {
      whereCondition += ` AND schedule_id = ${postData.filter.schedule_id}`
    }
    if (postData.filter && postData.filter.selectedDate) {
      whereCondition += ` AND selected_date = '${postData.filter.selectedDate}'`
    }
    if (postData.filter && postData.filter.reportNumber) {
      whereCondition += ` AND reportNumber = '${postData.filter.reportNumber}'`
    }
    if (postData.filter && postData.filter.startDate && postData.filter.endDate) {
      whereCondition += ` AND selected_date BETWEEN '${postData.filter.startDate}' AND '${postData.filter.endDate}' `
    }
    let query = `SELECT kde.*,IFNULL(DATE_FORMAT(kde.created_at, '%Y-%m-%d %H:%i:%s'), '') AS created_at,IFNULL(DATE_FORMAT(kde.updated_at, '%Y-%m-%d %H:%i:%s'), '') AS updated_at,IFNULL(DATE_FORMAT(kde.selected_date, '%Y-%m-%d'), '') AS selected_date,
                        COALESCE(
                             (
                                SELECT JSON_ARRAYAGG(
                                    JSON_OBJECT(
                                        'id', kdee.id,
                                        'equipment_name', kdee.equipment_name,
                                        'quantity', kdee.quantity,
                                        'hours', kdee.hours,
                                        'totalHours', kdee.total_hours
                                    )
                                )
                                FROM kps_daily_entry_equipments kdee
                                WHERE kdee.daily_entry_id = kde.id
                            ),
                            JSON_ARRAY()
                        ) AS equipments,
                        COALESCE(
                            (
                                SELECT JSON_ARRAYAGG(
                                    JSON_OBJECT(
                                        'id', kdev.id,
                                        'visitorName', kdev.visitor_name,
                                        'company', kdev.company,
                                        'quantity', kdev.quantity,
                                        'hours', kdev.hours,
                                        'totalHours', kdev.total_hours
                                    )
                                )
                                FROM kps_daily_entry_visitors kdev
                                WHERE kdev.daily_entry_id = kde.id
                            ),
                            JSON_ARRAY()
                        ) AS visitors,
                        COALESCE(
                            (
                                SELECT JSON_ARRAYAGG(
                                    JSON_OBJECT(
                                        'id', kdel.id,
                                        'contractorName', kdel.contractor_name,
                                        'roles',  (
                                            SELECT COALESCE(
                                                JSON_ARRAYAGG(
                                                    JSON_OBJECT(
                                                        'id', kdelr.id,
                                                        'roleName', kdelr.role_name,
                                                        'hours', kdelr.hours,
                                                        'quantity', kdelr.quantity,
                                                        'totalHours', kdelr.total_hours

                                                    )
                                                ),
                                                JSON_ARRAY()
                                            )
                                            FROM kps_daily_entry_labour_roles kdelr
                                            WHERE kdelr.labour_id = kdel.id
                                        )
                                    )
                                )
                                FROM kps_daily_entry_labours kdel
                                WHERE kdel.daily_entry_id = kde.id
                            ),
                            JSON_ARRAY()
                        ) AS labours,
                                    CASE  
                                        WHEN kde.logo IS NOT NULL THEN (
                                            COALESCE(
                                                (
                                                    SELECT JSON_ARRAYAGG(
                                                        JSON_OBJECT(
                                                            'companyName',kl.companyName,
                                                            'filename',kl.logoUrl,
                                                            'path', IFNULL(CONCAT('${process.env.Base_Url}', kl.folder_name, '/', kl.logoUrl), '')
                                                        )
                                                    )
                                                    FROM kps_logos kl
                                                    WHERE FIND_IN_SET(kl.id, kde.logo)
                                                ),
                                                JSON_ARRAY()
                                            )
                                        )
                                        ELSE JSON_ARRAY()
                                    END AS logo,
                                         COALESCE(
                                                  (
                                                      SELECT JSON_ARRAYAGG(
                                                          JSON_OBJECT(
                                                              'id',kpfd.id,
                                                              'filename', kpfd.file_url,
                                                              'comment', kdep.comment,
                                                              'path', IFNULL(CONCAT('${process.env.Base_Url}', kpfd.folder_name, '/', kpfd.file_url), '')
                                                          )
                                                      )
                                                      FROM kps_photofiles_doc kpfd
                                                      JOIN kps_daily_entry_photofiles kdep 
                                                      ON kpfd.id = kdep.photo_files_id
                                                      WHERE kdep.daily_entry_id = kde.id
                                                  ),
                                                  JSON_ARRAY()
                                              ) AS photoFiles,
  kps_schedules.project_name, kps_schedules.project_number,kps_schedules.owner,kps_users.username FROM kps_daily_entry AS kde LEFT JOIN kps_schedules ON kde.schedule_id = kps_schedules.id LEFT JOIN kps_users ON kps_users.id = kde.userId WHERE 1 = 1 ${whereCondition} ORDER BY created_at ASC;`
    let queryValues = []
    db.connection.query(query, queryValues, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }

    })

  })
}
dailyEntry.getEquipmentsDetails = (postData) => {
  return new Promise((resolve, reject) => {
    let query = `SELECT id,equipment_name,quantity,hours,total_hours FROM kps_daily_entry_equipments WHERE daily_entry_id = ?`
    let queryValues = [postData.dailyEntryId]
    db.connection.query(query, queryValues, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }

    })

  })
}
dailyEntry.getVisitorDetails = (postData) => {
  return new Promise((resolve, reject) => {
    let query = `SELECT id,visitor_name,company,quantity,hours,total_hours FROM kps_daily_entry_visitors WHERE daily_entry_id = ?`
    let queryValues = [postData.dailyEntryId]
    db.connection.query(query, queryValues, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }

    })

  })
}
dailyEntry.getLabourDetails = (postData) => {
  return new Promise((resolve, reject) => {
    let query = `SELECT id,contractor_name FROM kps_daily_entry_labours WHERE daily_entry_id = ?`
    let queryValues = [postData.dailyEntryId]
    db.connection.query(query, queryValues, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }

    })

  })
}
dailyEntry.getLabourRoleDetails = (postData) => {
  return new Promise((resolve, reject) => {
    let query = `SELECT id,role_name,hours,quantity,total_hours FROM kps_daily_entry_labour_roles WHERE labour_id = ?`
    let queryValues = [postData.labour_id]
    db.connection.query(query, queryValues, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }

    })

  })
}
dailyEntry.createDailyEntry = (postData) => {
  return new Promise((resolve, reject) => {
    let insertedData = {
      schedule_id: postData.schedule_id,
      selected_date: postData.selectedDate,
      location: postData.location,
      on_shore: postData.onShore,
      temp_high: postData.tempHigh,
      temp_low: postData.tempLow,
      weather: postData.weather,
      working_day: postData.workingDay,
      report_number: postData.reportNumber,
      contract_number: postData.contractNumber,
      contractor: postData.contractor,
      site_inspector: postData.siteInspector,
      time_in: postData.timeIn,
      time_out: postData.timeOut,
      totalHours: postData.totalHours,
      owner_contact: postData.ownerContact,
      owner_project_manager: postData.ownerProjectManager,
      contract_number: postData.contractNumber,
      component: postData.component,
      description: postData.description,
      logo: postData.logo ? postData.logo.join(',') : null,
      signature: postData.signature,
      pdfName: postData.pdfName,
      declerationFrom: postData.declerationFrom ? JSON.stringify(postData.declerationFrom) : null,
      userId: postData.user.userId,
      created_by: postData.user.userId,
      created_at: postData.user.dateTime
    }
    let query = `INSERT INTO ?? SET ?`
    let values = ['kps_daily_entry', insertedData]
    db.connection.query(query, values, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })

  })
}
dailyEntry.addEquipmentsData = (postData) => {
  return new Promise((resolve, reject) => {
    let insertedData = {
      daily_entry_id: postData.dailyEntryId,
      equipment_name: postData.equipment_name,
      quantity: postData.quantity || 0,
      hours: postData.hours || 0,
      total_hours: postData.totalHours || 0,
      created_by: postData.userId,
      created_at: postData.dateTime
    }
    let query = `INSERT INTO ?? SET ?`
    let values = ['kps_daily_entry_equipments', insertedData]
    db.connection.query(query, values, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })

  })
}
dailyEntry.addVisitorsData = (postData) => {
  return new Promise((resolve, reject) => {
    let insertedData = {
      daily_entry_id: postData.dailyEntryId,
      visitor_name: postData.visitorName,
      company: postData.company,
      quantity: postData.quantity || 0,
      hours: postData.hours || 0,
      total_hours: postData.totalHours || 0,
      created_by: postData.userId,
      created_at: postData.dateTime
    }
    let query = `INSERT INTO ?? SET ?`
    let values = ['kps_daily_entry_visitors', insertedData]
    db.connection.query(query, values, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })

  })
}
dailyEntry.addLaboursData = (postData) => {
  return new Promise((resolve, reject) => {
    let insertedData = {
      daily_entry_id: postData.dailyEntryId,
      contractor_name: postData.contractorName || null,
      created_by: postData.userId,
      created_at: postData.dateTime
    }
    let query = `INSERT INTO ?? SET ?`
    let values = ['kps_daily_entry_labours', insertedData]
    db.connection.query(query, values, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })

  })
}
dailyEntry.addLaboursRoleData = (postData) => {
  return new Promise((resolve, reject) => {
    let insertedData = {
      labour_id: postData.labour_id,
      role_name: postData.roleName,
      quantity: postData.quantity || 0,
      hours: postData.hours || 0,
      total_hours: postData.totalHours || 0,
      created_by: postData.userId,
      created_at: postData.dateTime
    }
    let query = `INSERT INTO ?? SET ?`
    let values = ['kps_daily_entry_labour_roles', insertedData]
    db.connection.query(query, values, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })

  })
}
dailyEntry.addPhotoFilesData = (postData) => {
  return new Promise((resolve, reject) => {
    let insertedData = {
      daily_entry_id: postData.dailyEntryId,
      photo_files_id: postData.id,
      comment: postData.comment ,
      created_by: postData.userId,
      created_at: postData.dateTime
    }
    let query = `INSERT INTO ?? SET ?`
    let values = ['kps_daily_entry_photofiles', insertedData]
    db.connection.query(query, values, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })

  })
}

module.exports = dailyEntry