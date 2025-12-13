const db = require("../config/db")
const moment = require("moment")

const mileage = () => { }


mileage.getUserMileage = (postData) => {
    return new Promise((resolve, reject) => {
        let whereCondition = ``
        if (postData.filter && postData.filter.userId) {
            whereCondition += ` AND km.user_id = ${postData.filter.userId}`
        }
        if (postData.filter && postData.filter.startDate && postData.filter.endDate) {
            whereCondition += ` AND km.date BETWEEN '${postData.filter.startDate}' AND '${postData.filter.endDate}'`
        }
        if (postData.filter && postData.filter.mileage_ids) {
            whereCondition += ` AND km.id IN (${postData.filter.mileage_ids})`
        }
        if (postData.filter && postData.filter.type == 'expense') {
            whereCondition += ` AND km.append_to_expense = '0'`
        }
        if (postData.filter && postData.filter.status) {
            whereCondition += ` AND km.status = '${postData.filter.status}'`
        }
        let query = `SELECT km.*, IFNULL(DATE_FORMAT(km.date, '%Y-%m-%d %H:%i:%s'), '') AS date, IFNULL(DATE_FORMAT(km.created_at, '%Y-%m-%d %H:%i:%s'), '') AS created_at, IFNULL((SELECT JSON_ARRAYAGG(JSON_OBJECT('latitude', coord.latitude, 'longitude', coord.longitude)) FROM kps_mileage_coordinates AS coord WHERE coord.mileage_id = km.id), JSON_ARRAY()) AS coordinates , ku.username FROM kps_mileage AS km LEFT JOIN kps_users ku ON ku.id = km.user_id WHERE 1 = 1 ${whereCondition} ORDER BY id DESC;`
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

mileage.addUserMileage = (postData) => {
    return new Promise((resolve, reject) => {
        let insertedData = {
            user_id: postData.user.userId,
            startLocation: postData.startLocation,
            endLocation: postData.endLocation,
            date: postData.date,
            totalDistance: postData.distance.toFixed(2),
            duration: postData.duration,
            amount: postData.amount.toFixed(2),
            append_to_expense: 0,
            created_at: postData.user.dateTime,
            created_by: postData.user.userId
        }
        let query = `INSERT INTO ?? SET ?`
        let values = ['kps_mileage', insertedData]
        db.connection.query(query, values, (err, res) => {
            if (err) {
                reject(err)
            } else {
                resolve(res)
            }
        })

    })
}
mileage.addUserMileageCoordinates = (postData) => {
    return new Promise((resolve, reject) => {
        let insertedData = {
            mileage_id: postData.mileage_id,
            latitude: postData.latitude,
            longitude: postData.longitude,
            created_at: postData.dateTime,
            created_by: postData.userId
        }
        let query = `INSERT INTO ?? SET ?`
        let values = ['kps_mileage_coordinates', insertedData]
        db.connection.query(query, values, (err, res) => {
            if (err) {
                reject(err)
            } else {
                resolve(res)
            }
        })

    })
}
mileage.updateMileageAppendStatus = (postData) => {
    return new Promise((resolve, reject) => {
        let updatedData = {
            append_to_expense: postData.expense_id,
            updated_at: postData.dateTime,
        }
        let query = `UPDATE ?? SET ? WHERE id = ?`
        let values = ['kps_mileage', updatedData, postData.id]
        db.connection.query(query, values, (err, res) => {
            if (err) {
                reject(err)
            } else {
                resolve(res)
            }
        })

    })
}
mileage.updateMileageStatus = (postData) => {
    return new Promise((resolve, reject) => {
        let updatedValues = {
            status: postData.status || "Pending",
            updated_at: postData.dateTime,
            updated_by: postData.userId
        }
        let query
        let values
        if (postData.id !== "") {
            query = `UPDATE ?? SET ? WHERE  append_to_expense = ? AND status = ? AND id = ?`
            values = ['kps_mileage', updatedValues, postData.expense_id, "Pending", postData.id]
        } else {
            query = `UPDATE ?? SET ? WHERE append_to_expense = ? AND status = ?`
            values = ['kps_mileage', updatedValues, postData.expense_id, "Pending"]
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

module.exports = mileage