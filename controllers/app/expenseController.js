const path = require("path");
const fs = require("fs"); // Import the file system module
const handlebars = require("handlebars");
const mileage = require("../../models/mileageModel");
const expense = require("../../models/expenseModel");
const generic = require("../../config/genricFn/common");
const db = require("../../config/db")
const { validationResult, matchedData } = require("express-validator");
const notification = require("../../models/Notification")
const moment = require("moment")

exports.addExpense = async (req, res) => {
  try {
    db.connection.beginTransaction()
    let mileageUser = []
    let mileage_ids = req.body.mileageIds.length ? req.body.mileageIds.join(',') : ''
    if (mileage_ids == "") {
      req.body.mileageExpense = 0
    } else {
      mileageUser = await mileage.getUserMileage({ filter: { userId: req.body.user.userId, mileage_ids: mileage_ids, type: 'expense' } });
      if (!mileageUser.length) {
        db.connection.rollback()
        return generic.error(req, res, {
          message: "This mileage has already been included in your submitted expense.",
        });
      } else {
        req.body.mileageExpense = mileageUser.reduce((sum, trip) => sum + trip.amount, 0)
      }

    }
    // req.body.pdfBaseName = path.basename(req.body.receipt);
    // req.body.folder_name = path.dirname(req.body.receipt);
    req.body.mileage_ids = mileage_ids
    const addExpense = await expense.addExpense(req.body)
    if (addExpense.insertId) {
      const expenseId = addExpense.insertId
      if (req.body.expenseType && req.body.expenseType.length) {
        for (let row of req.body.expenseType) {
          row.expenseId = expenseId
          row.dateTime = req.body.user.dateTime
          row.userId = req.body.user.userId
          const addExpenseType = await expense.addExpenseType(row)
          if (addExpenseType.insertId && row.images.length) {
            for (let x of row.images) {
              x.expenseTypeId = addExpenseType.insertId
              x.url = path.basename(x.path)
              x.folder_name = path.dirname(x.path)
              x.dateTime = req.body.user.dateTime
              x.userId = req.body.user.userId
              await expense.addExpenseTypeImages(x)
            }
          }
        }
      }
      if (mileageUser.length) {
        for (let row of mileageUser) {
          await mileage.updateMileageAppendStatus({ id: row.id, dateTime: req.body.user.dateTime, expense_id: addExpense.insertId })
        }
      }
      let notificationData = {
        subject: 'Expense',
        message: `${req.body.user.username} has submitted an expense and mileage report with a total amount of $${(req.body.expenseAmount + req.body.mileageExpense).toFixed(2)}.`,
        for_boss: '1',
        created_by: req.body.user.userId,
        dateTime: req.body.user.dateTime
      }
      await notification.addNotificationData(notificationData)
      db.connection.commit()
      return generic.success(req, res, {
        message: "Expense successfully created",
        data: {
          expenseId: addExpense.insertId
        },
      });
    } else {
      db.connection.rollback()
      return generic.success(req, res, {
        message: "Failed to create expense",
      });

    }

  } catch (error) {
    console.log('err', error)
    db.connection.rollback()
    return generic.error(req, res, {
      status: 500,
      message: "something went wrong!",
    });
  }
};
exports.getExpense = async (req, res) => {
  try {
    req.body.filter = {}
    if (!req.body.user.isBoss) {
      req.body.filter.userId = req.body.user.userId
    }
    const getExpenseData = await expense.getExpenseData(req.body)
    if (getExpenseData && getExpenseData.length) {
      // for (let row of getExpenseData) {
      //   // row.expenseType = await expense.getExpenseType({ expense_id: row.id })
      //   if (row.mileageIds !== '') {
      //     row.mileage = await mileage.getUserMileage({ filter: { mileage_ids: row.mileageIds } })
      //   } else {
      //     row.mileage = []
      //   }
      //   // if (row.expenseType.length) {
      //   //   // let expenseTypeId = row.expenseType.length ? row.expenseType.map((x) => x.id).join(",") : ""
      //   //   for (let element of row.expenseType) {
      //   //     element.images = await expense.getExpenseTypeImage({ expense_type_id: element.id })
      //   //   }
      //   // }
      // }
    }
    return generic.success(req, res, {
      message: "Expense list.",
      data: getExpenseData,
    });
  } catch (error) {
    console.log('error', error)
    return generic.error(req, res, {
      status: 500,
      message: "something went wrong!",
    });
  }
};
exports.getPendingApprovalList = async (req, res) => {
  try {
    const pendingApprovals = await ExpenseInfo.find({
      $or: [{ mileageStatus: "Pending" }, { expenseStatus: "Pending" }],
    }).populate("submittedBy", "username email");

    return generic.success(req, res, {
      message: "pending approval list.",
      data: pendingApprovals,
    });
  } catch (error) {
    return generic.error(req, res, {
      status: 500,
      message: "something went wrong!",
    });
  }
};
exports.updateExpenseItemStatus = async (req, res) => {
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
    const data = {
      expense_id: req.body.expense_id,
      userId: req.body.user.userId,
      dateTime: req.body.user.dateTime,
      key: req.body.type == 'expense' ? 'expenseStatus' : 'mileageStatus',
      status: req.body.status || 'Approved'
    };
    let itemIds = []
    let mileageIds = []
    let getExpenseDetails = await expense.getExpenseData({ filter: { expense_id: req.body.expense_id } })
    if (req.body.type == 'expense') {
      if (req.body.items && req.body.items.length) {
        for (let row of req.body.items) {
          itemIds.push(row.id)
          row.expense_id = req.body.expense_id
          row.dateTime = req.body.user.dateTime
          row.userId = req.body.user.userId
          await expense.updateExpenseItemStatus(row)
        }
        await expense.updateExpenseMileageStatus(data)
        if (getExpenseDetails[0]?.expenseAmount !== 0) {
          let notificationData = {
            userid: getExpenseDetails[0]?.userId,
            subject: 'Expense',
            message: `Your expense report has been ${data.status}.`,
            created_by: req.body.user.userId,
            dateTime: req.body.user.dateTime
          }
          await notification.addNotificationData(notificationData)
        }
      }
    } else {
      if (req.body.mileage && req.body.mileage.length) {
        for (let row of req.body.mileage) {
          mileageIds.push(row.id)
          row.expense_id = req.body.expense_id
          row.dateTime = req.body.user.dateTime
          row.userId = req.body.user.userId
          await mileage.updateMileageStatus(row)
        }
        await expense.updateExpenseMileageStatus(data)
        if (getExpenseDetails[0]?.mileageAmount !== 0) {
          let getMileageDetails = await mileage.getUserMileage({ filter: { mileage_ids: mileageIds.join(',') } })
          // let mileagerangeDates = getMileageDetails.map((x) => moment(x.date).format('DD-MMM-YYYY')).join(',')
          let notificationData = {
            userid: getMileageDetails[0]?.user_id,
            subject: 'Mileage',
            message: `Your mileage report has been ${data.status}.`,
            created_by: req.body.user.userId,
            dateTime: req.body.user.dateTime
          }
          await notification.addNotificationData(notificationData)
        }
      }
    }
    if (data.status == 'Approved') {
      let result = await generic.sendExpenseMileageMail({ expense_id: req.body.expense_id, type: req.body.type, item_id: itemIds.length ? itemIds.join(',') : "", mileage_id: mileageIds.length ? mileageIds.join(',') : "" })
      if (result) {
        db.connection.commit()
        return generic.success(req, res, {
          message: result.message,
        });

      } else {
        db.connection.rollback()
        return generic.error(req, res, {
          message: result.message,
        });
      }
    } else {
      db.connection.commit()
      return generic.success(req, res, {
        message: `User ${req.body.type} ${req.body.status}`,
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
