const db = require("../config/db")
const moment = require('moment')


const Leaves = () => { }

Leaves.getLeaveTypes = (postData) => {
    return new Promise((resolve, reject) => {
        let query = `SELECT kps_leave_type.*, IFNULL(DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s'), '') AS created_at,IFNULL(DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s'), '') AS updated_at FROM kps_leave_type `
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

Leaves.getLeavesList = (postData) => {
    let whereCondition = ``
    if (postData.filter && postData.filter.userId) {
        whereCondition += ` AND kla.user_id = '${postData.filter.userId}'`
    }
    if (postData.filter && postData.filter.from_date) {
        whereCondition += ` AND kla.from_date = '${postData.filter.from_date}'`
    }
    if (postData.filter && postData.filter.to_date) {
        whereCondition += ` AND kla.to_date = '${postData.filter.to_date}'`
    }
    if (postData.filter && postData.filter.id) {
        whereCondition += ` AND kla.id = '${postData.filter.id}'`
    }
    if (postData.filter && postData.filter.status) {
        whereCondition += ` AND kla.status = '${postData.filter.status}'`
    }
    return new Promise((resolve, reject) => {
        let query = `SELECT kla.id,kla.user_id ,ku.username AS applied_by,kla.from_date,kla.to_date,kla.reason,klt.leave_name AS leave_type,kla.status,ku1.username AS approved_by ,ku2.username AS rejected_by,IFNULL(DATE_FORMAT(kla.rejected_on, '%Y-%m-%d %H:%i:%s'), '') AS rejected_on,IFNULL(DATE_FORMAT(kla.created_at, '%Y-%m-%d %H:%i:%s'), '') AS created_at,IFNULL(DATE_FORMAT(kla.updated_at, '%Y-%m-%d %H:%i:%s'), '') AS updated_at,IFNULL(DATE_FORMAT(kla.approved_on, '%Y-%m-%d %H:%i:%s'), '') AS approved_on,
        IFNULL(DATE_FORMAT(kla.applied_on, '%Y-%m-%d %H:%i:%s'), '') AS applied_on,
        CASE 
        WHEN kla.status = 'approved' THEN 'Approved'
        WHEN kla.status = 'rejected' THEN 'Rejected'
        WHEN kla.status = 'cancelled' THEN 'Cancelled'
        ELSE 'Pending'
        END AS status_text
        FROM kps_leave_application kla LEFT JOIN kps_leave_type klt ON klt.id = kla.leave_type_id LEFT JOIN kps_users ku ON ku.id = kla.user_id LEFT JOIN kps_users ku1 ON ku1.id = kla.approved_by LEFT JOIN kps_users ku2 ON ku2.id = kla.rejected_by WHERE 1 = 1 ${whereCondition} `
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

module.exports = Leaves