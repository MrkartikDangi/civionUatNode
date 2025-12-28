const generic = require("../../config/genricFn/common");
const { validationResult, matchedData } = require("express-validator");
const {
  invoiceReportTemplate,
} = require("../../utils/pdfHandlerNew/htmlHandler");
const Schedule = require("../../models/scheduleModel")
const Invoice = require("../../models/InvoiceModel");
const ExcelJS = require("exceljs");
const path = require("path");
const moment = require("moment");
const fs = require("fs");
const db = require("../../config/db")

exports.getInvoiceData = async (req, res) => {
  try {
    let getInvoiceData = await Invoice.getInvoiceData(req.body)
    return generic.success(req, res, {
      message: "Invoices fetched successfully",
      data: getInvoiceData,
    });
  } catch (error) {
    console.log('error', error)
    return generic.error(req, res, {
      status: 500,
      message: "something went wrong!",
    });
  }
};

exports.createInvoice = async (req, res) => {
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
    let getScheduleData = await Schedule.getScheduleData({ filter: { schedule_id: req.body.schedule_id } })
    if (!getScheduleData.length) {
      return generic.validationError(req, res, { message: "schedule does'nt exists" });
    }
    const createInvoice = await Invoice.createInvoice(req.body);
    if (createInvoice.insertId) {
      if (req.body.userDetails && req.body.userDetails.length) {
        for (let row of req.body.userDetails) {
          row.invoiceId = createInvoice.insertId
          row.createdByUserId = req.body.user.userId
          row.dateTime = req.body.user.dateTime
          await Invoice.addInvoiceUserDetails(row)
        }
      }
      db.connection.commit()
      return generic.success(req, res, {
        message: "Invoice created successfully.",
        data: {
          id: createInvoice.insertId
        },
      });
    } else {
      db.connection.rollback()
      return generic.error(req, res, {
        message: "Failed to create invoie.",
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

exports.generateInvoiceExcel = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const x = matchedData(req);
    return generic.validationError(req, res, {
      message: "Needs to fill required input fields",
      validationObj: errors.mapped(),
    });
  }
  try {

    const isBoss = req.body.user.isBoss;
    if (isBoss) {
      const data = await Invoice.getInvoiceExcelData(req.body)
      if (data && data.length) {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("KPS Monthly Invoicing Summary");

        const maxUserDetailsLength = Math.max(
          ...data.map((item) => item.userDetails.length),
        );
        const colLength = 5 + maxUserDetailsLength * 5;

        sheet.columns = Array(colLength + 2).fill({ width: 25 });

        const offset = 1;
        const startCharCode = 65 + offset;
        const startCol = String.fromCharCode(startCharCode);
        const nextCol = String.fromCharCode(startCharCode + 1);
        const endCol = String.fromCharCode(startCharCode + colLength - 1);

        sheet.mergeCells(`${startCol}2:${endCol}2`);
        sheet.getCell(`${startCol}2`).value = "KPS Monthly Invoicing Summary";
        sheet.getCell(`${startCol}2`).font = { size: 14, bold: true };
        sheet.getCell(`${startCol}2`).alignment = {
          horizontal: "left",
          vertical: "left",
        };

        const from = moment(req.body.startDate).format("MMM-D-YYYY");
        const to = moment(req.body.endDate).format("MMM-D-YYYY");

        sheet.mergeCells(`${startCol}3:${startCol}4`);
        sheet.getCell(`${startCol}3`).value = "Invoiced duration:";
        sheet.getCell(`${startCol}3`).font = { size: 10, bold: true };
        sheet.getCell(`${startCol}3`).alignment = {
          horizontal: "left",
          vertical: "middle",
        };

        sheet.mergeCells(`${nextCol}3:${endCol}4`);
        sheet.getCell(`${nextCol}3`).value = `${from} to ${to}`;
        sheet.getCell(`${nextCol}3`).alignment = {
          horizontal: "left",
          vertical: "middle",
        };

        const uniqueUserNames = [
          ...new Set(
            data.flatMap(item =>
              item.userDetails
                .map(user => {
                  if (!user.userName || !user.userName.trim()) return null;
                  return user.userName
                    .trim()
                    .split(/\s+/)
                    .map(name => name.charAt(0).toUpperCase() + name.slice(1).toLowerCase())
                    .join(' ');
                })
                .filter(Boolean)
            )
          ),
        ];
        sheet.getColumn(6).width = 50;
        sheet.getColumn(6).alignment = { wrapText: true, vertical: "top" };

        // Table Header
        const tableHeader = [
          "S.no",
          "Client",
          "Invoice To",
          "Project Name",
          "Project Number",
          "KPS Billing Description on Invoice",
          ...uniqueUserNames,
          "Total Billable Hours",
          "Rate",
          "Sub-Total",
          "Total",
        ];
        const headerRow = sheet.addRow(tableHeader);

        headerRow.eachCell((cell, colNumber) => {
          const isNonEmpty = cell.value !== undefined && cell.value !== "";

          if (isNonEmpty) {
            cell.font = { bold: true };
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFD9D9D9" },
            };
            cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
            cell.border = {
              top: { style: "thin" },
              bottom: { style: "thin" },
              left: { style: "thin" },
              right: { style: "thin" },
            };
          }
        });


        sheet.getColumn(7).width = 50;
        const totalHoursByUser = uniqueUserNames.map(() => 0);
        let grandTotalBillableHours = 0;
        let grandTotalSubTotal = 0;
        let grandTotal = 0;

        for (let i = 0; i < data.length; i++) {
          const invoice = data[i];
          const dataRow = [
            i + 1,
            invoice.owner,
            invoice.invoice_to,
            invoice.projectName,
            invoice.project_number,
            invoice.description,
          ];

          uniqueUserNames.forEach((userName, index) => {
            const user = userName != null ? invoice.userDetails.find((u) => u.userName && u.userName.trim().toLowerCase() === userName.trim().toLowerCase()) : undefined;
            const totalHours = user ? user.totalBillableHours : null;
            dataRow.push(totalHours);
            totalHoursByUser[index] += totalHours;
          });


          const totalBillableHours = invoice.userDetails.reduce(
            (sum, u) => sum + (u.totalBillableHours || 0),
            0
          );
          const subTotal = invoice.userDetails.reduce(
            (sum, u) => sum + (u.subTotal || 0),
            0
          );
          const rate = invoice.rate ?? 0;;
          const totalAmount = parseFloat(subTotal * 1.13);


          dataRow.push(totalBillableHours, rate, subTotal, totalAmount);

          const row = sheet.addRow(dataRow);
          const lastColIndex = row.cellCount;
          row.getCell(lastColIndex - 2).numFmt = '"$"#,##,##0.00';
          row.getCell(lastColIndex - 1).numFmt = '"$"#,##,##0.00';
          row.getCell(lastColIndex).numFmt = '"$"#,##,##0.00';

          grandTotalBillableHours += totalBillableHours;
          grandTotalSubTotal += subTotal;
          grandTotal += totalAmount;
        }
        const totalRow = sheet.addRow([
          "",
          "",
          "",
          "",
          "",
          "",
          ...totalHoursByUser,
          grandTotalBillableHours,
          "",
          parseFloat(grandTotalSubTotal.toFixed(2)),
          parseFloat(grandTotal.toFixed(2)),
        ]);

        totalRow.font = { bold: true };
        const lastTotalColIndex = totalRow.cellCount;

        // Apply currency formatting for Sub-Total and Total
        totalRow.getCell(lastTotalColIndex - 1).numFmt = '"$"#,##0.00';
        totalRow.getCell(lastTotalColIndex).numFmt = '"$"#,##0.00';
        let dates = {
          formattedFromDate: moment(req.body.startDate).format("DD-MMM-YYYY"),
          formattedToDate: moment(req.body.endDate).format("DD-MMM-YYYY"),
        };

        const buffer = await workbook.xlsx.writeBuffer();
        let getMailInfo = await generic.getEmailInfo({ module_type: 'invoice' })
        let Maildata = {
          to: getMailInfo?.email_to ?? '',
          cc: getMailInfo?.email_cc ?? '',
          bcc: getMailInfo?.email_bcc ?? '',
          subject: `Invoice Report`,
          html: invoiceReportTemplate(dates),
          attachments: [
            {
              filename: `Kps_Invoice_${moment(req.body.startDate).format("DD-MMM-YYYY")} to ${moment(req.body.endDate).format("DD-MMM-YYYY")}.xlsx`,
              content: buffer,
              contentType:
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            },
          ],
        };

        let result = await generic.sendEmails(Maildata);
        if (result) {
          // await generic.initializeOneDrive()
          // let data = {
          //   filePath: req.files?.file[0]?.path,
          //   fileName: `Kps_Invoice_${moment(req.body.startDate).format("DD-MMM-YYYY")} to ${moment(req.body.endDate).format("DD-MMM-YYYY")}.xlsx`,
          //   folderPath: `civion/Invoice`,
          //   fetchType: 'buffer'
          // }
          // await generic.uploadFileToOneDrive(data)
          return generic.success(req, res, {
            status: 200,
            message: `The invoice report has been successfully generated and sent via email`,
          });
        }
        // let base64Excel = buffer.toString('base64')
        // return generic.success(req, res, {
        //   message: "Invoice excel.",
        //   data: data
        // })

        // res.setHeader('Content-Disposition', 'attachment; filename=Invoice_Summary.xlsx');
        // res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        // res.send(buffer);
      } else {
        return generic.success(req, res, {
          status: 200,
          message: `No invoice is generated from ${moment(req.body.startDate).format("DD-MMM-YYYY")} to ${moment(req.body.endDate).format("DD-MMM-YYYY")}.`,
          data: data,
        });
      }
    } else {
      return generic.error(req, res, {
        message: "You are not allowed to generate excel!",
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
