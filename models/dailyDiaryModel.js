const db = require("../config/db")
const moment = require('moment')

const dailyDiary = () => { }

dailyDiary.getDailyDiary = (postData) => {
    return new Promise((resolve, reject) => {
        let whereCondition = ``
        if (postData.filter && postData.filter.userId) {
            whereCondition += ` AND userId = ${postData.filter.userId}`
        }
        if (postData.filter && postData.filter.schedule_id) {
            whereCondition += ` AND schedule_id = ${postData.filter.schedule_id}`
        }
        if (postData.filter && postData.filter.selectedDate) {
            whereCondition += ` AND selectedDate = '${postData.filter.selectedDate}'`
        }
        if (postData.filter && postData.filter.reportNumber) {
            whereCondition += ` AND reportNumber = '${postData.filter.reportNumber}'`
        }
        if (postData.filter && postData.filter.startDate && postData.filter.endDate) {
            whereCondition += ` AND selectedDate BETWEEN '${postData.filter.startDate}' AND '${postData.filter.endDate}' `
        }
        let query = `SELECT kdd.*,ku.username,IFNULL(DATE_FORMAT(kdd.created_at, '%Y-%m-%d %H:%i:%s'), '') AS created_at,IFNULL(DATE_FORMAT(kdd.updated_at, '%Y-%m-%d %H:%i:%s'), '') AS updated_at,IFNULL(DATE_FORMAT(kdd.selectedDate, '%Y-%m-%d'), '') AS selectedDate ,
                                         CASE  
                                        WHEN kdd.logo IS NOT NULL THEN (
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
                                                    WHERE FIND_IN_SET(kl.id, kdd.logo)
                                                ),
                                                JSON_ARRAY()
                                            )
                                        )
                                        ELSE JSON_ARRAY()
                                    END AS logo
        FROM kps_daily_diary kdd LEFT JOIN kps_users ku ON ku.id = kdd.userId WHERE 1 = 1 ${whereCondition} ORDER BY created_at ASC`

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
dailyDiary.createDailyDiary = (postData) => {
    return new Promise((resolve, reject) => {
        let insertedData = {
            schedule_id: postData.schedule_id,
            selectedDate: postData.selectedDate,
            ownerProjectManager: postData.ownerProjectManager,
            contractNumber: postData.contractNumber,
            contractor: postData.contractor,
            ownerContact: postData.ownerContact,
            description: postData.description,
            IsChargable: postData.IsChargable,
            reportNumber: postData.reportNumber,
            siteInspector: postData.siteInspector,
            timeIn: postData.timeIn,
            timeOut: postData.timeOut,
            totalHours: postData.totalHours,
            logo: postData.logo ? postData.logo.join(',') : null,
            signature: postData.signature,
            pdfName: postData.pdfName,
            userId: postData.user.userId,
            created_by: postData.user.userId,
            created_at: postData.user.dateTime
        }
        let query = `INSERT INTO ?? SET ?`
        let values = ['kps_daily_diary', insertedData]
        db.connection.query(query, values, (err, res) => {
            if (err) {
                reject(err)
            } else {
                resolve(res)
            }
        })

    })
}
dailyDiary.updateDailyDiary = (postData) => {
    return new Promise((resolve, reject) => {
        let updatedValues = {
            schedule_id: postData.schedule_id,
            selectedDate: postData.selectedDate,
            ownerProjectManager: postData.ownerProjectManager,
            contractNumber: postData.contractNumber,
            contractor: postData.contractor,
            ownerContact: postData.ownerContact,
            description: postData.description,
            IsChargable: postData.IsChargable,
            reportNumber: postData.reportNumber,
            siteInspector: postData.siteInspector,
            timeIn: postData.timeIn,
            timeOut: postData.timeOut,
            totalHours: postData.totalHours,
            userId: postData.user.userId,
            updated_by: postData.user.userId,
            updated_at: postData.user.dateTime,
        }
        let query = `UPDATE ?? SET ? WHERE id = ?`
        let values = ['kps_daily_diary', updatedValues, postData.id]
        db.connection.query(query, values, (err, res) => {
            if (err) {
                reject(err)
            } else {
                resolve(res)
            }
        })

    })
}

module.exports = dailyDiary;
