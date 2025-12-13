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