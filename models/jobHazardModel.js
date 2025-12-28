const db = require("../config/db")

const jobHazard = () => { }

jobHazard.getJobHazardData = (postData) => {
  let whereCondition = ``
  if (postData.filter && postData.filter.userId) {
    whereCondition += ` AND j.created_by = ${postData.filter.userId}`
  }
  if (postData.filter && postData.filter.schedule_id) {
    whereCondition += ` AND j.schedule_id = ${postData.filter.schedule_id}`
  }
  if (postData.filter && postData.filter.selectedDate) {
    whereCondition += ` AND DATE(j.selected_date) = '${postData.filter.selectedDate}'`
  }
  return new Promise((resolve, reject) => {
    let query = `SELECT j.*, COALESCE(JSON_ARRAYAGG(JSON_OBJECT('activityName', a.activityName,'otherTextValue',a.otherTextValue,'activities', (SELECT JSON_ARRAYAGG(TRIM(value)) FROM JSON_TABLE(CONCAT('["', REPLACE(a.activity_types, ',', '","'), '"]'), '$[*]' COLUMNS (value VARCHAR(255) PATH '$')) AS jt))), JSON_ARRAY()) AS selectedActivities, COALESCE((SELECT JSON_ARRAYAGG(JSON_OBJECT('task', t.task, 'severity', t.severity, 'hazard', t.hazard, 'controlPlan', t.controlPlan)) FROM kps_jobHazardTasks t WHERE t.job_hazard_id = j.id), JSON_ARRAY()) AS tasks,ks.project_name AS schedule_name FROM kps_jobhazard j LEFT JOIN kps_jobHazardActvity a ON a.job_hazard_id = j.id LEFT JOIN kps_schedules ks ON ks.id = j.schedule_id WHERE 1 = 1 ${whereCondition} GROUP BY j.id ORDER BY j.id desc;`
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

jobHazard.addJobHazardData = (postData) => {
  return new Promise((resolve, reject) => {
    let insertedData = {
      worker_name: postData.WorkerName,
      project_name: postData.projectName,
      selected_date: postData.selectedDate,
      employerSignature: postData.employerSignature,
      approverSignature: null,
      approverSignatureId: null,
      schedule_id: postData.schedule_id,
      time: postData.time,
      location: postData.location,
      description: postData.description,
      siteOrientationChecked: postData.siteOrientationChecked || false,
      toolBoxMeetingChecked: postData.toolBoxMeetingChecked || false,
      created_by: postData.user.userId,
      created_at: postData.user.dateTime,
    }
    let query = `INSERT INTO ?? SET ?`
    let queryValues = ['kps_jobhazard', insertedData]
    db.connection.query(query, queryValues, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}
jobHazard.addActivityData = (postData) => {
  return new Promise((resolve, reject) => {
    let insertedData = {
      activityName: postData.activityName,
      otherTextValue: postData.otherTextValue,
      activity_types: postData.activities.length ? postData.activities.join(',') : null,
      job_hazard_id: postData.jobHazardId,
      created_by: postData.userId,
      created_at: postData.dateTime,
    }
    let query = `INSERT INTO ?? SET ?`
    let queryValues = ['kps_jobHazardActvity', insertedData]
    db.connection.query(query, queryValues, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}
jobHazard.addTaskData = (postData) => {
  return new Promise((resolve, reject) => {
    let insertedData = {
      job_hazard_id: postData.jobHazardId,
      task: postData.task,
      severity: postData.severity,
      hazard: postData.hazard,
      controlPlan: postData.controlPlan,
      created_by: postData.userId,
      created_at: postData.dateTime,
    }
    let query = `INSERT INTO ?? SET ?`
    let queryValues = ['kps_jobHazardTasks', insertedData]
    db.connection.query(query, queryValues, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}
jobHazard.updateJobHazardData = (postData) => {
  return new Promise((resolve, reject) => {
    let updatedData = {
      worker_name: postData.WorkerName,
      project_name: postData.projectName,
      selected_date: postData.selectedDate,
      employerSignature: postData.employerSignature,
      approverSignature: postData.approverSignature,
      approverSignatureId: postData.user.userId,
      schedule_id: postData.schedule_id,
      time: postData.time,
      location: postData.location,
      description: postData.description,
      siteOrientationChecked: postData.siteOrientationChecked || false,
      toolBoxMeetingChecked: postData.toolBoxMeetingChecked || false,
      completedStatus: postData.completedStatus,
      updated_at: postData.user.dateTime,
    }
    let query = `UPDATE ?? SET ? WHERE id = ?`
    let queryValues = ['kps_jobhazard', updatedData, postData.id]
    db.connection.query(query, queryValues, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}

module.exports = jobHazard