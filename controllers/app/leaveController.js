const generic = require("../../config/genricFn/common");
const { validationResult, matchedData } = require("express-validator");
const path = require("path");
const moment = require("moment");
const leaveModel = require("../../models/leaveModel")
const db = require("../../config/db")
const notification = require("../../models/Notification")
const {
    leaveTemplate,
} = require("../../utils/pdfHandlerNew/htmlHandler");


exports.getLeaveTypes = async (req, res) => {
    try {
        const getLeaveTypes = await leaveModel.getLeaveTypes(req.body);
        if (getLeaveTypes.length) {
            let getUserLeaveData = await generic.selectData('kps_users', { id: req.body.user.userId })
            let data = getLeaveTypes.map(item => ({
                id: item.id,
                leave_name: item.leave_name,
                leave_code: item.leave_code,
                is_active: item.is_active,
                available_leaves: item.leave_name.toLowerCase() == 'vacation leave' ? getUserLeaveData[0]?.vaccation_leave : item.leave_name.toLowerCase() == 'paid leave' ? getUserLeaveData[0]?.paid_leave : 0
            }));
            return generic.success(req, res, {
                message: "Leaves Types List",
                data: data,
            });
        } else {
            return generic.error(req, res, {
                message: "Leave type data is not available"
            });
        }

    } catch (error) {
        console.log('error', error)
        return generic.error(req, res, {
            status: 500,
            message: "Something went wrong !"
        });
    }
};

exports.getLeaveList = async (req, res) => {
    try {
        const getLeavesList = await leaveModel.getLeavesList(req.body);
        return generic.success(req, res, {
            message: "Leaves List",
            data: getLeavesList,
        });
    } catch (error) {
        console.log('error', error)
        return generic.error(req, res, {
            status: 500,
            message: "Something went wrong !"
        });
    }
};

exports.addLeaveData = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const x = matchedData(req);
        return generic.validationError(req, res, {
            message: "Needs to fill required input fields",
            validationObj: errors.mapped(),
        });
    }
    try {
        db.connection.beginTransaction()
        const existingUserLeaves = {
            filter: {
                userId: req.body.user.userId,
                from_date: req.body.from_date,
                to_date: req.body.to_date,
                check_overlap: true
            }
        }
        const checkExistingLeaves = await leaveModel.getLeavesList(existingUserLeaves);
        if (checkExistingLeaves.length) {
            db.connection.rollback()
            return generic.error(req, res, {
                message: `You have already applied leave on this date range`
            });
        }
        let insertLeaveData = {
            user_id: req.body.user.userId,
            from_date: req.body.from_date,
            to_date: req.body.to_date,
            leave_type_id: req.body.leave_type_id,
            leave_manager_id: req.body.leave_manager_id || null,
            leave_approval_level: req.body.leave_approval_level,
            no_of_days: req.body.no_of_days,
            reason: req.body.reason,
            applied_on: req.body.user.dateTime,
            created_at: req.body.user.dateTime
        }
        let createLeaveDetails = await generic.insertData('kps_leave_application', insertLeaveData)
        if (createLeaveDetails.id) {
            let getLeaveType = await generic.selectData('kps_leave_type', { id: req.body.leave_type_id }, ['leave_name'])
            let getUserLeaveData = await generic.selectData('kps_users', { id: req.body.user.userId })
            if ((getLeaveType[0]?.leave_name.toLowerCase() == 'vacation leave' && getUserLeaveData[0]?.vaccation_leave < req.body.no_of_days) || (getLeaveType[0]?.leave_name.toLowerCase() == 'paid leave' && getUserLeaveData[0]?.paid_leave < req.body.no_of_days)) {
                db.connection.rollback()
                return generic.error(req, res, {
                    message: "You have applied for more leave days than your current balance allows",
                });
            }
            let updateUserLeaveDetails = {}
            if (getLeaveType[0]?.leave_name.toLowerCase() !== 'unpaid leave') {
                if (getLeaveType[0]?.leave_name.toLowerCase() == 'vacation leave') {
                    updateUserLeaveDetails = {
                        vaccation_leave: getUserLeaveData[0]?.vaccation_leave - req.body.no_of_days
                    }
                } else if (getLeaveType[0]?.leave_name.toLowerCase() == 'paid leave') {
                    updateUserLeaveDetails = {
                        paid_leave: getUserLeaveData[0]?.paid_leave - req.body.no_of_days
                    }
                } else {
                    db.connection.rollback()
                    return generic.error(req, res, {
                        message: "Invalid Leave Type",
                    });
                }
            }
            let userFcmToken
            let notificationData
            if (req.body.leave_manager_id && req.body.leave_approval_level == 0) {
                userFcmToken = await generic.selectData('kps_users', { id: req.body.leave_manager_id, fcm_device_id: 'IS NOT NULL' }, ['fcm_device_id'])
                notificationData = {
                    subject: 'Leave',
                    userid: req.body.leave_manager_id,
                    message: `${req.body.user.username} has submitted a leave request from ${req.body.from_date} to ${req.body.to_date}`,
                    created_by: req.body.user.userId,
                    dateTime: req.body.user.dateTime
                }
            } else {
                userFcmToken = await generic.selectData('kps_users', { is_boss: '1', fcm_device_id: 'IS NOT NULL' }, ['fcm_device_id'])
                notificationData = {
                    subject: 'Leave',
                    message: `${req.body.user.username} has submitted a leave request from ${req.body.from_date} to ${req.body.to_date}`,
                    for_boss: '1',
                    created_by: req.body.user.userId,
                    dateTime: req.body.user.dateTime
                }
            }
            if (userFcmToken.length) {
                for (let row of userFcmToken) {
                    if (row?.fcm_device_id) {
                        let notificationFcmData = {
                            fcmDeviceId: row.fcm_device_id,
                            title: 'Leave',
                            body: `${req.body.user.username} has submitted a leave request from ${moment(req.body.from_date).format('DD-MMM-YYYY')} to ${moment(req.body.to_date).format('DD-MMM-YYYY')}.`,
                            image: '',
                            data: {}
                        }
                        await generic.sendNotification(notificationFcmData)
                    }
                }
            }
            await notification.addNotificationData(notificationData)
            if (Object.keys(updateUserLeaveDetails).length) {
                await generic.updateData('kps_users', updateUserLeaveDetails, { id: req.body.user.userId })
            }
            db.connection.commit()
            return generic.success(req, res, {
                message: "Leave applied successfully",
                data: {
                    id: createLeaveDetails.id
                },
            });
        } else {
            db.connection.rollback()
            return generic.error(req, res, {
                message: "Failed to applied leave",
            });
        }

    } catch (error) {
        console.log('err0r', error)
        db.connection.rollback()
        return generic.error(req, res, {
            status: 500,
            message: "Something went wrong !"
        });
    }
};
exports.updateLeaveData = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const x = matchedData(req);
        return generic.validationError(req, res, {
            message: "Needs to fill required input fields",
            validationObj: errors.mapped(),
        });
    }
    try {
        db.connection.beginTransaction()
        const checkLeaveStatus = {
            filter: {
                id: req.body.id,
                status: 'pending'
            }
        }
        const getLeaveStatus = await leaveModel.getLeavesList(checkLeaveStatus);
        if (!getLeaveStatus.length) {
            db.connection.rollback()
            return generic.error(req, res, {
                message: `You cannot update the leave details, as the status of the leave is already changed.`
            });
        }
        const existingUserLeaves = {
            filter: {
                id: req.body.id,
                userId: req.body.user.userId,
                from_date: req.body.from_date,
                to_date: req.body.to_date,
                check_overlap: false
            }
        }
        const checkExistingLeaves = await leaveModel.getLeavesList(existingUserLeaves);
        if (checkExistingLeaves.length) {
            db.connection.rollback()
            return generic.error(req, res, {
                message: `You have already applied leave on this date range`
            });
        }
        // if (getLeaveStatus[0]?.leave_type_id !== req.body.leave_type_id && getLeaveStatus[0]?.leave_type.toLowerCase() !== 'unpaid leave') {
        //     let getUserLeaveData = await generic.selectData('kps_users', { id: req.body.user.userId })
        //     let updateUserLeaveDetails
        //     if (getLeaveStatus[0]?.leave_type.toLowerCase() == 'vacation leave') {
        //         updateUserLeaveDetails = {
        //             vaccation_leave: getUserLeaveData[0]?.vaccation_leave + getLeaveStatus[0]?.no_of_days
        //         }
        //     }
        //     if (getLeaveStatus[0]?.leave_type.toLowerCase() == 'paid leave') {
        //         updateUserLeaveDetails = {
        //             paid_leave: getUserLeaveData[0]?.paid_leave + getLeaveStatus[0]?.no_of_days
        //         }
        //     }
        //     await generic.updateData('kps_users', updateUserLeaveDetails, { id: req.body.user.userId })
        // }
        // let getLeaveType = await generic.selectData('kps_leave_type', { id: req.body.leave_type_id }, ['no_of_days'])
        let updateLeaveData = {
            from_date: req.body.from_date,
            to_date: req.body.to_date,
            leave_type_id: req.body.leave_type_id,
            no_of_days: req.body.no_of_days,
            // leave_manager_id: req.body.leave_manager_id,
            reason: req.body.reason,
            updated_at: req.body.user.dateTime
        }
        let whereClause = {
            id: req.body.id
        }
        let updateLeaveDetails = await generic.updateData('kps_leave_application', updateLeaveData, whereClause)
        if (updateLeaveDetails.status) {
            let getLeaveType = await generic.selectData('kps_leave_type', { id: req.body.leave_type_id }, ['leave_name'])
            if (getLeaveType[0]?.leave_name.toLowerCase() !== 'unpaid leave') {

                let getUserLeaveData = await generic.selectData('kps_users', { id: req.body.user.userId })

                let updateUserLeaveDetails = {}

                const oldDays = Number(getLeaveStatus[0]?.no_of_days)
                const newDays = Number(req.body.no_of_days)
                const daysDifference = Math.abs(newDays - oldDays)
                if (newDays > oldDays) {

                    if (getLeaveType[0]?.leave_name.toLowerCase() === 'vacation leave') {
                        updateUserLeaveDetails.vaccation_leave =
                            getUserLeaveData[0]?.vaccation_leave - daysDifference
                    }

                    if (getLeaveType[0]?.leave_name.toLowerCase() === 'paid leave') {
                        updateUserLeaveDetails.paid_leave =
                            getUserLeaveData[0]?.paid_leave - daysDifference
                    }
                }

                if (newDays < oldDays) {

                    if (getLeaveType[0]?.leave_name.toLowerCase() === 'vacation leave') {
                        updateUserLeaveDetails.vaccation_leave =
                            getUserLeaveData[0]?.vaccation_leave + daysDifference
                    }

                    if (getLeaveType[0]?.leave_name.toLowerCase() === 'paid leave') {
                        updateUserLeaveDetails.paid_leave =
                            getUserLeaveData[0]?.paid_leave + daysDifference
                    }
                }

                if (Object.keys(updateUserLeaveDetails).length > 0) {
                    await generic.updateData('kps_users', updateUserLeaveDetails, { id: req.body.user.userId })
                }
            }
            db.connection.commit()
            return generic.success(req, res, {
                message: "Leave updated successfully"
            });
        } else {
            db.connection.rollback()
            return generic.error(req, res, {
                message: "Failed to applied leave",
            });
        }

    } catch (error) {
        console.log('error', error)
        db.connection.rollback()
        return generic.error(req, res, {
            status: 500,
            message: "Something went wrong !"
        });
    }
};
exports.updateLeaveStatus = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const x = matchedData(req);
        return generic.validationError(req, res, {
            message: "Needs to fill required input fields",
            validationObj: errors.mapped(),
        });
    }
    try {
        await db.connection.beginTransaction()
        const checkLeaveStatus = {
            filter: {
                id: req.body.id,
                user_id: req.body.user_id
            }
        }
        const getLeaveStatus = await leaveModel.getLeavesList(checkLeaveStatus);
        if (getLeaveStatus.length) {
            if (getLeaveStatus[0]?.status_text == 'Rejected' || getLeaveStatus[0]?.status_text == 'Cancelled') {
                let message = `The leave request cannot be ${req.body.status} because it has already been ${getLeaveStatus[0]?.status}`
                // if (getLeaveStatus[0]?.status_text == 'Approved') {
                //     message += ` by ${getLeaveStatus[0]?.approved_by}`
                // }
                if (getLeaveStatus[0]?.status_text == 'Rejected') {
                    message += ` by ${getLeaveStatus[0]?.rejected_by}`
                }
                if (getLeaveStatus[0]?.status_text == 'Cancelled') {
                    message += ` by user itself.`
                }
                db.connection.rollback()
                return generic.error(req, res, {
                    message: message
                });
            }
            let updateUserLeave = {
                status: req.body.status,
                updated_at: req.body.user.dateTime,
                leave_approval_level: req.body.leave_approval_level,
                // leave_manager_id: req.body.leave_manager_id,
            }
            let notificationBody = ``
            // let notificaitonAdminBody = ``
            let notificationTitle = ``
            let notificationData = {
                subject: 'Leave',
                created_by: req.body.user.userId,
                dateTime: req.body.user.dateTime,
            }
            let userFcmToken = await generic.selectData('kps_users', { id: req.body.user_id, fcm_device_id: 'IS NOT NULL' }, ['fcm_device_id'])
            let adminFcmToken = []
            if (req.body.status == 'pending' && req.body.leave_approval_level == 1) {
                updateUserLeave.approved_by = req.body.user.userId
                updateUserLeave.approved_on = req.body.user.dateTime
                // notificationBody = `Your leave request for the period ${moment(getLeaveStatus[0]?.from_date).format('DD-MMM-YYYY')} to ${moment(getLeaveStatus[0]?.to_date).format('DD-MMM-YYYY')} has been approved at the current approval level and is awaiting final approval.`;

                notificationTitle = "Leave Status Update";
                notificationBody = `${req.body.user.username} has approved the leave request submitted by ${getLeaveStatus[0]?.applied_by} for the period ${moment(getLeaveStatus[0]?.from_date).format('DD-MMM-YYYY')} to ${moment(getLeaveStatus[0]?.to_date).format('DD-MMM-YYYY')}. The request is awaiting your final approval.`;
                adminFcmToken = await generic.selectData('kps_users', { is_boss: '1', fcm_device_id: 'IS NOT NULL' }, ['fcm_device_id'])

                notificationData.message = `${req.body.user.username} has approved the leave request submitted by ${getLeaveStatus[0]?.applied_by} for the period ${moment(getLeaveStatus[0]?.from_date).format('DD-MMM-YYYY')} to ${moment(getLeaveStatus[0]?.to_date).format('DD-MMM-YYYY')}. The request is awaiting your final approval.`
                notificationData.for_boss = '1'

            }
            if (req.body.status == 'approved') {
                updateUserLeave.approved_by = req.body.approved_by
                updateUserLeave.approved_on = req.body.user.dateTime

                notificationBody = `Your leave request for the period ${moment(getLeaveStatus[0]?.from_date).format('DD-MMM-YYYY')} to ${moment(getLeaveStatus[0]?.to_date).format('DD-MMM-YYYY')} has been approved successfully.`;
                notificationTitle = "Leave Approved";

                notificationData.message = `Your leave request for the period ${moment(getLeaveStatus[0]?.from_date).format('DD-MMM-YYYY')} to ${moment(getLeaveStatus[0]?.to_date).format('DD-MMM-YYYY')} has been approved successfully.`
                notificationData.userid = req.body.user_id

            }

            if (req.body.status == 'rejected') {
                updateUserLeave.rejected_by = req.body.user.userId
                updateUserLeave.rejected_on = req.body.user.dateTime

                notificationBody = `We regret to inform you that your leave request for the period ${moment(getLeaveStatus[0]?.from_date).format('DD-MMM-YYYY')} to ${moment(getLeaveStatus[0]?.to_date).format('DD-MMM-YYYY')} has been rejected. Please contact your reporting manager for further details if required.`;
                notificationTitle = "Leave Rejected";

                notificationData.message = `We regret to inform you that your leave request for the period ${moment(getLeaveStatus[0]?.from_date).format('DD-MMM-YYYY')} to ${moment(getLeaveStatus[0]?.to_date).format('DD-MMM-YYYY')} has been rejected. Please contact your reporting manager for further details if required.`
                notificationData.userid = req.body.user_id

            }

            let whereClause = {
                id: req.body.id,
                user_id: req.body.user_id
            }
            let updateLeaveDetails = await generic.updateData('kps_leave_application', updateUserLeave, whereClause)
            if (updateLeaveDetails.status) {
                let getUserLeaveData = await generic.selectData('kps_users', { id: req.body.user_id })
                let getLeaveType = await generic.selectData('kps_leave_type', { id: req.body.leave_type_id }, ['leave_name'])
                if (req.body.status == 'rejected' || req.body.status == 'cancelled') {

                    if (getLeaveType[0]?.leave_name.toLowerCase() !== 'unpaid leave') {
                        let updateUserLeaveDetails
                        if (getLeaveType[0]?.leave_name.toLowerCase() == 'vacation leave') {
                            updateUserLeaveDetails = {
                                vaccation_leave: getUserLeaveData[0]?.vaccation_leave + req.body.no_of_days
                            }
                        } else if (getLeaveType[0]?.leave_name.toLowerCase() == 'paid leave') {
                            updateUserLeaveDetails = {
                                paid_leave: getUserLeaveData[0]?.paid_leave + req.body.no_of_days
                            }
                        } else {
                            db.connection.rollback()
                            return generic.error(req, res, {
                                message: "Invalid Leave Type",
                            });
                        }
                        await generic.updateData('kps_users', updateUserLeaveDetails, { id: req.body.user_id })
                    }

                }
                // if (req.body.status == 'pending' && req.body.leave_approval_level == 1) {
                //     if (userFcmToken.length) {
                //         for (let row of userFcmToken) {
                //             if (row?.fcm_device_id) {
                //                 const notificationFcmData = {
                //                     fcmDeviceId: row.fcm_device_id,
                //                     title: notificationTitle,
                //                     body: notificationBody,
                //                     image: '',
                //                     data: {}
                //                 }
                //                 await generic.sendNotification(notificationFcmData)
                //             }
                //         }
                //     }
                //     if (adminFcmToken.length) {
                //         for (let row of adminFcmToken) {
                //             if (row?.fcm_device_id) {
                //                 const notificationFcmData = {
                //                     fcmDeviceId: row.fcm_device_id,
                //                     title: notificationTitle,
                //                     body: notificaitonAdminBody,
                //                     image: '',
                //                     data: {}
                //                 }
                //                 await generic.sendNotification(notificationFcmData)
                //             }
                //         }
                //     }
                // } else {
                //     if (userFcmToken.length) {
                //         for (let row of userFcmToken) {
                //             if (row?.fcm_device_id) {
                //                 const notificationFcmData = {
                //                     fcmDeviceId: row.fcm_device_id,
                //                     title: notificationTitle,
                //                     body: notificationBody,
                //                     image: '',
                //                     data: {}
                //                 }
                //                 await generic.sendNotification(notificationFcmData)
                //             }
                //         }
                //     }
                // }
                if (userFcmToken.length) {
                    for (let row of userFcmToken) {
                        if (row?.fcm_device_id) {
                            const notificationFcmData = {
                                fcmDeviceId: row.fcm_device_id,
                                title: notificationTitle,
                                body: notificationBody,
                                image: '',
                                data: {}
                            }
                            await generic.sendNotification(notificationFcmData)
                        }
                    }
                }
                if (adminFcmToken.length) {
                    for (let row of adminFcmToken) {
                        if (row?.fcm_device_id) {
                            const notificationFcmData = {
                                fcmDeviceId: row.fcm_device_id,
                                title: notificationTitle,
                                body: notificationBody,
                                image: '',
                                data: {}
                            }
                            await generic.sendNotification(notificationFcmData)
                        }
                    }
                }
                await notification.addNotificationData(notificationData)

                if (req.body.status == 'approved') {
                    let getMailInfo = await generic.getEmailInfo({ module_type: 'Leave' })
                    let leaveTemplateData = {
                        employeeName: getUserLeaveData[0]?.username ?? '',
                        leaveType: getLeaveType[0]?.leave_name,
                        startDate: moment(getLeaveStatus[0]?.from_date).format('DD-MMM-YYYY'),
                        endDate: moment(getLeaveStatus[0]?.to_date).format('DD-MMM-YYYY'),
                        currentYear: moment(new Date()).format('YYYY')
                    }
                    let Maildata = {
                        to: getMailInfo?.email_to ?? '',
                        cc: getMailInfo?.email_cc ?? '',
                        bcc: getMailInfo?.email_bcc ?? '',
                        subject: `Leave Request Approved`,
                        html: leaveTemplate(leaveTemplateData),
                        attachments: [],
                    };
                    await generic.sendEmails(Maildata)
                }
                db.connection.commit()
                return generic.success(req, res, {
                    message: `Leave ${req.body.status} successfully`
                });
            } else {
                db.connection.rollback()
                return generic.error(req, res, {
                    message: `Failed to ${req.body.status} leave`,
                });
            }
        } else {
            db.connection.rollback()
            return generic.error(req, res, {
                message: `Leave details not found`
            });
        }
    } catch (error) {
        console.log('error', error)
        db.connection.rollback()
        return generic.error(req, res, {
            status: 500,
            message: "Something went wrong !"
        });
    }
};