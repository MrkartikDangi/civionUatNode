const oneDriveModel = require("../../models/oneDriveModel")
const generic = require("../../config/genricFn/common");
const { validationResult, matchedData } = require("express-validator");
const Schedule = require("../../models/scheduleModel");
const fs = require('fs')

exports.uploadToOneDrive = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const x = matchedData(req);
        return generic.validationError(req, res, {
            message: "Needs to fill required input fields",
            validationObj: errors.mapped(),
        });
    }
    try {
        if (req?.files && req.files?.file?.length) {
            const MAX_FILE_SIZE = 5 * 1024 * 1024;
            if (req.files?.file?.size > MAX_FILE_SIZE) {
                return generic.error(req, res, {
                    message: "File size exceeds the 5 MB limit. Please upload a smaller file.",
                });

            }
            await generic.initializeOneDrive()
            let getScheduleData = await Schedule.getScheduleData({ filter: { schedule_id: req.body.schedule_id } })
            let data = {
                filePath: req.files?.file[0]?.path,
                fileName: req.files?.file[0]?.originalname,
                folderPath: `civion/${getScheduleData[0]?.project_name ?? 'DefaultProject'}/${req.body.type}`,
                fetchType: 'local'
            }
            let uploadedResult = await generic.uploadFileToOneDrive(data)
            if (uploadedResult.success) {
                fs.unlinkSync(data.filePath)
                return generic.success(req, res, {
                    message: "File successfully uploaded to one drive",
                    data: uploadedResult
                });
            } else {
                return generic.error(req, res, {
                    message: "File uploadation failed on one drive",
                });
            }
        } else {
            return generic.error(req, res, {
                message: "Select atleast one file for uploadation",
            });
        }

    } catch (error) {
        console.log('error',error)
        return generic.error(req, res, {
            status: 500,
            message: "something went wrong!",
        });
    }

}
