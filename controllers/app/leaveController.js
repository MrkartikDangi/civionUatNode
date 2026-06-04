const generic = require("../../config/genricFn/common");
const { validationResult, matchedData } = require("express-validator");
const path = require("path");
const moment = require("moment");
const leaveModel = require("../../models/leaveModel")
const db = require("../../config/db")


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
                available_leaves: item.leave_name.toLowerCase() == 'vaccation leave' ? getUserLeaveData[0]?.vaccation_leave : item.leave_name.toLowerCase() == 'paid leave' ? getUserLeaveData[0]?.paid_leave : 0
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
                to_date: req.body.to_date
            }
        }
        const checkExistingLeaves = await leaveModel.getLeavesList(existingUserLeaves);
        if (checkExistingLeaves.length) {
            db.connection.rollback()
            return generic.error(req, res, {
                message: `You have already applied leave on this date range ${req.body.from_date} - ${req.body.to_date}`
            });
        }
        let insertLeaveData = {
            user_id: req.body.user.userId,
            from_date: req.body.from_date,
            to_date: req.body.to_date,
            leave_type_id: req.body.leave_type_id,
            leave_manager_id: req.body.leave_manager_id,
            no_of_days: req.body.no_of_days,
            reason: req.body.reason,
            applied_on: req.body.user.dateTime,
            created_at: req.body.user.dateTime
        }
        let createLeaveDetails = await generic.insertData('kps_leave_application', insertLeaveData)
        if (createLeaveDetails.id) {
            let getLeaveType = await generic.selectData('kps_leave_type', { id: req.body.leave_type_id }, ['leave_name'])
            let getUserLeaveData = await generic.selectData('kps_users', { id: req.body.user.userId })
            if ((getLeaveType[0]?.leave_name.toLowerCase() == 'vaccation leave' && getUserLeaveData[0]?.vaccation_leave < req.body.no_of_days) || (getLeaveType[0]?.leave_name.toLowerCase() == 'paid leave' && getUserLeaveData[0]?.paid_leave < req.body.no_of_days)) {
                db.connection.rollback()
                return generic.error(req, res, {
                    message: "You have applied for more leave days than your current balance allows",
                });
            }
            let updateUserLeaveDetails
            if (getLeaveType[0]?.leave_name.toLowerCase() == 'vaccation leave') {
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
            await generic.updateData('kps_users', updateUserLeaveDetails, { id: req.body.user.userId })
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
        let updateLeaveData = {
            from_date: req.body.from_date,
            to_date: req.body.to_date,
            leave_type_id: req.body.leave_type_id,
            leave_manager_id: req.body.leave_manager_id,
            reason: req.body.reason,
            updated_at: req.body.user.dateTime
        }
        let whereClause = {
            id: req.body.id
        }
        let updateLeaveDetails = await generic.updateData('kps_leave_application', updateLeaveData, whereClause)
        if (updateLeaveDetails.status) {
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
        db.connection.beginTransaction()
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
                leave_manager_id: req.body.leave_manager_id,
            }
            if (req.body.status == 'pending' && req.body.leave_approval_level == 1) {
                updateUserLeave.approved_by = req.body.user.userId
                updateUserLeave.approved_on = req.body.user.dateTime
            }
            if (req.body.status == 'approved' && req.body.leave_approval_level > 1) {
                updateUserLeave.approved_by = `${getLeaveStatus[0]?.approved_by},${req.body.user.userId}`
                updateUserLeave.approved_on = req.body.user.dateTime
            }
            if (req.body.status == 'rejected') {
                updateUserLeave.rejected_by = req.body.user.userId
                updateUserLeave.rejected_on = req.body.user.dateTime

            }
            let whereClause = {
                id: req.body.id,
                user_id: req.body.user_id
            }
            let updateLeaveDetails = await generic.updateData('kps_leave_application', updateUserLeave, whereClause)
            if (updateLeaveDetails.status) {
                if (req.body.status == 'rejected') {
                    let getLeaveType = await generic.selectData('kps_leave_type', { id: req.body.leave_type_id }, ['leave_name'])
                    let getUserLeaveData = await generic.selectData('kps_users', { id: req.body.user_id })
                    let updateUserLeaveDetails
                    if (getLeaveType[0]?.leave_name.toLowerCase() == 'vaccation leave') {
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
        db.connection.rollback()
        return generic.error(req, res, {
            status: 500,
            message: "Something went wrong !"
        });
    }
};