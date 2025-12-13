const db = require("../config/db")
const moment = require('moment')

const expense = () => { }


expense.getExpenseData = (postData) => {
  return new Promise((resolve, reject) => {
    let whereCondition = ``
    if (postData.filter && postData.filter.userId) {
      whereCondition += ` AND userId = ${postData.filter.userId}`
    }
    if (postData.filter && postData.filter.expense_id) {
      whereCondition += ` AND kps_expense.id = ${postData.filter.expense_id}`
    }
    if (postData.filter && postData.filter.startDate && postData.filter.endDate) {
      whereCondition += ` AND kps_expense.createdAt BETWEEN '${postData.filter.startDate}' AND '${postData.filter.endDate}' `
    }
    if (postData.filter && postData.filter.expenseStatus) {
      whereCondition += ` AND kps_expense.expenseStatus = '${postData.filter.expenseStatus}'`
    }
    if (postData.filter && postData.filter.mileageStatus) {
      whereCondition += ` AND kps_expense.mileageStatus = '${postData.filter.mileageStatus}'`
    }
    // let query = `SELECT  kps_expense.*, IFNULL(DATE_FORMAT(kps_expense.createdAt, '%Y-%m-%d %H:%i:%s'), '') AS createdAt,IFNULL(DATE_FORMAT(kps_expense.updatedAt, '%Y-%m-%d %H:%i:%s'), '') AS updatedAt,IFNULL(CONCAT('${process.env.Base_Url}',kps_expense.folder_name,'/', kps_expense.receipt), '') as receipt,kps_users.username,kps_users.email , kps_schedules.project_name,kps_schedules.project_number FROM kps_expense LEFT JOIN kps_users ON kps_users.id = kps_expense.userId LEFT JOIN kps_schedules ON kps_schedules.id = kps_expense.schedule_id WHERE 1 = 1 ${whereCondition} ORDER BY kps_expense.id DESC`


    let query = `SELECT kps_expense.*,IFNULL(DATE_FORMAT(kps_expense.createdAt, '%Y-%m-%d %H:%i:%s'), '') AS createdAt,IFNULL(DATE_FORMAT(kps_expense.updatedAt, '%Y-%m-%d %H:%i:%s'), '') AS updatedAt,IFNULL(CONCAT('${process.env.Base_Url}', kps_expense.folder_name, '/', kps_expense.receipt), '') AS receipt,kps_users.username,kps_users.email,kps_schedules.project_name,kps_schedules.project_number,
                            COALESCE(
                                JSON_ARRAYAGG(
                                    JSON_OBJECT(
                                        'id', ket.id,
                                        'title', ket.title,
                                        'amount', ket.amount,
                                        'category', ket.category,
                                        'status', ket.status,
                                        'created_by', ket.created_by,
                                        'images', (
                                            SELECT COALESCE(
                                                JSON_ARRAYAGG(
                                                    JSON_OBJECT(
                                                        'id', keti.id,
                                                        'file_url', IFNULL(CONCAT('${process.env.Base_Url}', keti.folder_name, '/', keti.path), '')
                                                    )
                                                ),
                                                JSON_ARRAY()
                                            )
                                            FROM kps_expense_type_image keti
                                            WHERE keti.expense_type_id = ket.id
                                        )
                                    )
                                ),
                                JSON_ARRAY()
                            ) AS expenseType,
                              CASE  WHEN kps_expense.mileageIds IS NOT NULL 
                                    AND kps_expense.mileageIds <> '' 
                                THEN (
                                    SELECT COALESCE(
                                        JSON_ARRAYAGG(
                                            JSON_OBJECT(
                                                'id', km.id,
                                                'date', DATE_FORMAT(km.date, '%Y-%m-%d %H:%i:%s'),
                                                'startLocation', km.startLocation,
                                                'endLocation', km.endLocation,
                                                'duration', km.duration,
                                                'totalDistance', km.totalDistance,
                                                'append_to_expense', km.append_to_expense,
                                                'amount', km.amount,
                                                'status', km.status,
                                                'coordinates', (
                                                    SELECT COALESCE(
                                                        JSON_ARRAYAGG(
                                                            JSON_OBJECT(
                                                                'latitude', kmc.latitude,
                                                                'longitude', kmc.longitude
                                                            )
                                                        ),
                                                        JSON_ARRAY()
                                                    )
                                                    FROM kps_mileage_coordinates kmc
                                                    WHERE kmc.mileage_id = km.id
                                                )
                                            )
                                        ),
                                        JSON_ARRAY()
                                    )
                                    FROM kps_mileage km
                                    WHERE FIND_IN_SET(km.id, kps_expense.mileageIds)
                                )
                                ELSE JSON_ARRAY()
                            END AS mileage
    FROM kps_expense LEFT JOIN kps_users ON kps_users.id = kps_expense.userId LEFT JOIN kps_schedules ON kps_schedules.id = kps_expense.schedule_id LEFT JOIN kps_expense_type ket ON ket.expense_id = kps_expense.id LEFT JOIN kps_mileage km ON km.id = kps_expense.mileageIds WHERE 1 = 1 ${whereCondition} GROUP BY kps_expense.id ORDER BY kps_expense.id DESC;`
    let queryValues = []
    db.connection.query(query, queryValues, (err, res) => {
      if (err) {
        reject(err)
      } else {
        if (res.length) {
          for (let row of res) {
            row.mileageIds = row.mileageIds !== "" ? row.mileageIds.split(',') : ""
          }
        }
        resolve(res)
      }

    })

  })
}
expense.getExpenseType = (postData) => {
  return new Promise((resolve, reject) => {
    let query = ``
    let queryValues
    if (postData.filter) {
      query = `SELECT ket.id, ket.title,ket.amount,ket.category,ket.status,ket.created_by,ku.username FROM kps_expense_type AS ket LEFT JOIN kps_users AS ku ON ku.id = ket.created_by WHERE ket.id IN (${postData.filter.id}) AND ket.status = ? `
      queryValues = [postData.filter.status]
    } else {
      query = `SELECT  id,title,amount,category,status,created_by FROM kps_expense_type WHERE expense_id = ?`
      queryValues = [postData.expense_id]
    }
    db.connection.query(query, queryValues, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }

    })

  })
}
expense.getExpenseTypeImage = (postData) => {
  return new Promise((resolve, reject) => {
    let whereCondition = ` AND expense_type_id = ?`
    if (postData.filter && postData.filter.expense_type_id) {
      whereCondition = ` AND expense_type_id IN (${postData.filter.expense_type_id})`
    }
    let query = `SELECT  id,path,folder_name,created_by , IFNULL(DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s'), '') AS created_at,IFNULL(CONCAT('${process.env.Base_Url}',kps_expense_type_image.folder_name,'/', kps_expense_type_image.path), '') as file_url FROM kps_expense_type_image WHERE 1 = 1 ${whereCondition}`
    let queryValues = [postData.expense_type_id]
    db.connection.query(query, queryValues, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }

    })

  })
}


expense.addExpense = (postData) => {
  return new Promise((resolve, reject) => {
    let insertedData = {
      userId: postData.user.userId,
      employeeName: postData.employeeName,
      startDate: postData.startDate || null,
      endDate: postData.endDate || null,
      expenditure: postData.expenditure || null,
      schedule_id: postData.schedule_id || null,
      category: postData.category || null,
      task: postData.task || null,
      // receipt: postData.pdfBaseName || null,
      folder_name: postData.folder_name || null,
      mileageAmount: postData.mileageExpense || null,
      expenseAmount: postData.expenseAmount || null,
      mileageIds: postData.mileage_ids || '',
      createdAt: postData.user.dateTime,
      created_by: postData.user.userId
    }
    let query = `INSERT INTO ?? SET ?`
    let queryValues = ["kps_expense", insertedData]
    db.connection.query(query, queryValues, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}
expense.addExpenseType = (postData) => {
  return new Promise((resolve, reject) => {
    let insertedData = {
      expense_id: postData.expenseId,
      title: postData.title || null,
      amount: postData.amount,
      category: postData.category || null,
      status: postData.status,
      created_at: postData.dateTime,
      created_by: postData.userId
    }
    let query = `INSERT INTO ?? SET ?`
    let queryValues = ["kps_expense_type", insertedData]
    db.connection.query(query, queryValues, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}
expense.addExpenseTypeImages = (postData) => {
  return new Promise((resolve, reject) => {
    let insertedData = {
      expense_type_id: postData.expenseTypeId,
      path: postData.url || null,
      folder_name: postData.folder_name,
      created_at: postData.dateTime,
      created_by: postData.userId
    }
    let query = `INSERT INTO ?? SET ?`
    let queryValues = ["kps_expense_type_image", insertedData]
    db.connection.query(query, queryValues, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}
expense.updateExpenseMileageStatus = (postData) => {
  return new Promise((resolve, reject) => {
    let updatedValues = {
      [postData.key]: postData.status || "Pending",
      updatedAt: postData.dateTime,
      updated_by: postData.userId
    }
    let query = `UPDATE ?? SET ? WHERE id = ?`
    let values = ['kps_expense', updatedValues, postData.expense_id]
    db.connection.query(query, values, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}
expense.updateExpenseItemStatus = (postData) => {
  return new Promise((resolve, reject) => {
    let updatedValues = {
      status: postData.status || "Pending",
      updated_at: postData.dateTime,
      updated_by: postData.userId
    }
    let query
    let values
    if (postData.id !== "") {
      query = `UPDATE ?? SET ? WHERE id = ? AND expense_id = ? AND status = ?`
      values = ['kps_expense_type', updatedValues, postData.id, postData.expense_id, "Pending"]
    } else {
      query = `UPDATE ?? SET ? WHERE expense_id = ? AND status = ?`
      values = ['kps_expense_type', updatedValues, postData.expense_id, "Pending"]
    }
    db.connection.query(query, values, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}

module.exports = expense