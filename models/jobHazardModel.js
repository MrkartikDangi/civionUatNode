const db = require("../config/db")

const jobHazard = () => { }

jobHazard.getJobHazardData = (postData) => {
  return new Promise((resolve, reject) => {
    let query = `SELECT j.*, COALESCE(JSON_ARRAYAGG(JSON_OBJECT('activityName', a.activityName, 'activity', (SELECT JSON_ARRAYAGG(TRIM(value)) FROM JSON_TABLE(CONCAT('["', REPLACE(a.activity_types, ',', '","'), '"]'), '$[*]' COLUMNS (value VARCHAR(255) PATH '$')) AS jt))), JSON_ARRAY()) AS activities, COALESCE((SELECT JSON_ARRAYAGG(JSON_OBJECT('task', t.task, 'severity', t.severity, 'hazard', t.hazard, 'controlPlan', t.controlPlan)) FROM kps_jobHazardTasks t WHERE t.job_hazard_id = j.id), JSON_ARRAY()) AS tasks FROM kps_jobhazard j LEFT JOIN kps_jobHazardActvity a ON a.job_hazard_id = j.id GROUP BY j.id;`
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

module.exports = jobHazard