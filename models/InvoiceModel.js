const db = require("../config/db")

const invoice = () => { }


invoice.getInvoiceData = (postData) => {
    return new Promise((resolve, reject) => {
        let whereCondition = ``

        let query = `SELECT kps_invoice.*,IFNULL(DATE_FORMAT(kps_invoice.created_at, '%Y-%m-%d %H:%i:%s'), '') AS created_at,IFNULL(DATE_FORMAT(kps_invoice.updated_at, '%Y-%m-%d %H:%i:%s'), '') AS updated_at,kps_schedules.project_name,kps_schedules.project_number,kps_schedules.owner,IFNULL(
        JSON_ARRAYAGG(
            JSON_OBJECT(
                'invoiceId', kiud.invoiceId,
                'userId', kiud.userId,
                'totalHours', kiud.totalHours,
                'totalBillableHours', kiud.totalBillableHours,
                'subTotal', kiud.subTotal,
                'total', kiud.total
            )
        ),
        JSON_ARRAY()
       ) AS invoiceUserDetails
       FROM kps_invoice LEFT JOIN kps_invoiceuserdetails kiud ON kiud.invoiceId = kps_invoice.id LEFT JOIN kps_schedules ON kps_schedules.id = kps_invoice.schedule_id WHERE 1 = 1 ${whereCondition} GROUP BY kps_invoice.id`
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

invoice.createInvoice = (postData) => {
    return new Promise((resolve, reject) => {
        let insertedData = {
            schedule_id: postData.schedule_id,
            fromDate: postData.fromDate,
            toDate: postData.toDate,
            invoiceTo: postData.invoiceTo,
            description: postData.description,
            subTotal: postData.subTotal,
            totalAmount: postData.totalAmount,
            totalBillableHours: postData.totalBillableHours,
            created_by: postData.user.userId,
            created_at: postData.user.dateTime
        }
        let query = `INSERT INTO ?? SET ?`
        let values = ['kps_invoice', insertedData]
        db.connection.query(query, values, (err, res) => {
            if (err) {
                reject(err)
            } else {
                resolve(res)
            }
        })

    })
}
invoice.addInvoiceUserDetails = (postData) => {
    return new Promise((resolve, reject) => {
        let insertedData = {
            invoiceId: postData.invoiceId,
            userId: postData.userId,
            totalHours: postData.totalHours,
            totalBillableHours: postData.totalBillableHours,
            subTotal: postData.subTotal,
            total: postData.total,
            created_by: postData.createdByUserId,
            created_at: postData.dateTime
        }
        let query = `INSERT INTO ?? SET ?`
        let values = ['kps_invoiceuserdetails', insertedData]
        db.connection.query(query, values, (err, res) => {
            if (err) {
                reject(err)
            } else {
                resolve(res)
            }
        })

    })
}
invoice.getInvoiceExcelData = (postData) => {
    return new Promise((resolve, reject) => {
        // let query = `SELECT ks.id AS id,ks.project_name AS projectName,ks.owner AS owner,ks.project_number,ks.description,ks.rate,ks.invoice_to,JSON_ARRAYAGG(
        //                         JSON_OBJECT(
        //                             'userName', u.username,
        //                             'totalBillableHours', COALESCE(dd.totalHours, 0) + COALESCE(de.totalHours, 0),
        //                             'subTotal', (COALESCE(dd.totalHours, 0) + COALESCE(de.totalHours, 0)) * ks.rate


        //                         )
        //                     ) AS userDetails
        //                       FROM kps_schedules ks JOIN (
        //                     SELECT DISTINCT userId, schedule_id 
        //                     FROM kps_daily_entry 
        //                     WHERE selected_date BETWEEN '${postData.startDate}' AND '${postData.endDate}'
        //                     UNION 
        //                     SELECT DISTINCT userId, schedule_id 
        //                     FROM kps_daily_diary 
        //                     WHERE selectedDate BETWEEN '${postData.startDate}' AND '${postData.endDate}'
        //                     AND IsChargable = '1'
        //                 ) t ON ks.id = t.schedule_id JOIN kps_users u ON u.id = t.userId 
        //                     LEFT JOIN (
        //                         SELECT 
        //                             schedule_id, 
        //                             userId, 
        //                             SUM(CAST(totalHours AS DECIMAL(10,2))) AS totalHours
        //                         FROM kps_daily_diary 
        //                         WHERE selectedDate BETWEEN '${postData.startDate}' AND '${postData.endDate}'
        //                         AND IsChargable = '1'
        //                         GROUP BY schedule_id, userId
        //                     ) dd 
        //                         ON dd.userId = u.id 
        //                         AND dd.schedule_id = ks.id 
        //                     LEFT JOIN (
        //                         SELECT 
        //                             schedule_id, 
        //                             userId,
        //                             SUM(CAST(totalHours AS DECIMAL(10,2))) AS totalHours
        //                         FROM kps_daily_entry
        //                         WHERE selected_date BETWEEN '${postData.startDate}' AND '${postData.endDate}'
        //                         GROUP BY schedule_id, userId
        //                     ) de 
        //                         ON de.userId = u.id 
        //                         AND de.schedule_id = ks.id GROUP BY ks.project_name, ks.id, ks.owner;`
        let query = `SELECT  ks.id AS id,ks.project_name AS projectName,ks.owner AS owner,ks.project_number,ks.description,ks.rate,ks.invoice_to,
        COALESCE(
            JSON_ARRAYAGG(
                JSON_OBJECT(
                    'userName', u.username,
                    'totalBillableHours', COALESCE(dd.totalHours, 0) + COALESCE(de.totalHours, 0),
                    'subTotal', (COALESCE(dd.totalHours, 0) + COALESCE(de.totalHours, 0)) * ks.rate
                )
            ), 
            JSON_ARRAY()
        ) AS userDetails FROM kps_schedules ks LEFT JOIN (
        SELECT DISTINCT userId, schedule_id 
        FROM kps_daily_entry 
        WHERE selected_date BETWEEN '${postData.startDate}' AND '${postData.endDate}'
        UNION 
        SELECT DISTINCT userId, schedule_id 
        FROM kps_daily_diary 
        WHERE selectedDate BETWEEN '${postData.startDate}' AND '${postData.endDate}'
        AND IsChargable = '1'
        ) t ON ks.id = t.schedule_id LEFT JOIN kps_users u ON u.id = t.userId LEFT JOIN (
        SELECT 
            schedule_id, 
            userId, 
            SUM(CAST(totalHours AS DECIMAL(10,2))) AS totalHours
        FROM kps_daily_diary 
        WHERE selectedDate BETWEEN '${postData.startDate}' AND '${postData.endDate}'
        AND IsChargable = '1'
        GROUP BY schedule_id, userId
        ) dd ON dd.userId = u.id AND dd.schedule_id = ks.id
        LEFT JOIN (
            SELECT 
                schedule_id, 
                userId,
                SUM(CAST(totalHours AS DECIMAL(10,2))) AS totalHours
            FROM kps_daily_entry
            WHERE selected_date BETWEEN '${postData.startDate}' AND '${postData.endDate}'
            GROUP BY schedule_id, userId
        ) de ON de.userId = u.id AND de.schedule_id = ks.id
        GROUP BY ks.id, ks.project_name, ks.owner, ks.project_number, ks.description, ks.rate, ks.invoice_to;`
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


module.exports = invoice