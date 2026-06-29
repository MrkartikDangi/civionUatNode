const generic = require("../../config/genricFn/common");
const { validationResult, matchedData } = require("express-validator");
const db = require("../../config/db")

exports.getSettingFields = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const x = matchedData(req);
        return generic.validationError(req, res, {
            message: "Needs to fill required input fields",
            validationObj: errors.mapped(),
        });
    }
    try {
        const settings = await generic.getSettingFields(req.body);
        return generic.success(req, res, {
            message: "Setting Fields List.",
            data: settings,
        });
    } catch (error) {
        return generic.error(req, res, {
            status: 500,
            message: "something went wrong!",
        });
    }
};

exports.updateSettingFields = async (req, res) => {
    try {
        if (!req.body.settingData && !req.body.settingData.length) {
            return generic.error(req, res, {
                message: "Provide Details For Updatation",
            });
        }
        for (let row of req.body.settingData){
            let updateSettingData = {
                setting_value: row?.setting_value,
                updated_by: req.body.user.userId,
                updated_on: req.body.user.dateTime
            }
            await generic.updateData('kps_settings',updateSettingData, {  setting_key: row?.setting_key })
        }
        return generic.success(req, res, {
            message: "Settings Updated Successfully",
            data: settings,
        });
    } catch (error) {
        return generic.error(req, res, {
            status: 500,
            message: "something went wrong!",
        });
    }
};
