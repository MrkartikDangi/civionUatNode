const mileage = require("../../models/mileageModel");
const generic = require("../../config/genricFn/common");
const User = require("../../models/userModel");
const db = require("../../config/db")
const { validationResult, matchedData } = require("express-validator");

exports.addUserMileage = async (req, res) => {
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
        const user = await User.checkExistingUser({ userId: req.body.user.userId });
        if (!user.length) {
            return generic.error(req, res, { message: "User not found" });
        }
        let addUserMileage = await mileage.addUserMileage(req.body)
        if (addUserMileage.insertId) {
            if (req.body.coords && req.body.coords.length) {
                for (let row of req.body.coords) {
                    row.mileage_id = addUserMileage.insertId
                    row.userId = req.body.user.userId
                    row.dateTime = req.body.user.dateTime
                    await mileage.addUserMileageCoordinates(row)
                }
            }
            db.connection.commit()
            return generic.success(req, res, {
                message: "User mileage successfully added.",
                data: {
                    id: addUserMileage.insertId
                }
            });

        } else {
            db.connection.rollback()
            return generic.error(req, res, {
                message: "Failed to add user mileage",
            });

        }
    } catch (error) {
        console.log('error', error)
        db.connection.rollback()
        return generic.error(req, res, {
            status: 500,
            message: "something went wrong!",
        });
    }
};
exports.getUserMileage = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const x = matchedData(req);
        return generic.validationError(req, res, {
            message: "Needs to fill required input fields",
            validationObj: errors.mapped(),
        });
    }
    try {
        const user = await User.checkExistingUser({ userId: req.body.user.userId });
        if (!user.length) {
            return generic.error(req, res, { message: "User not found" });
        }
        req.body.filter.userId = req.body.user.userId
        let getUserMileage = await mileage.getUserMileage(req.body)

        return generic.success(req, res, {
            message: "Trip history fetched successfully",
            data: getUserMileage,
        });
    } catch (error) {
        return generic.error(req, res, {
            status: 500,
            message: "Error fetching trip history",
            details: error.message,
        });
    }
};
