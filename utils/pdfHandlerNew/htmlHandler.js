const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");

const weeklytemplatePath = path.join(
  __dirname,
  "../../view/weeklyTemplate.html",
);
const weeklytemplateSource = fs.readFileSync(weeklytemplatePath, "utf8");
const dailyTemplatePath = path.join(__dirname, "../../view/dailyTemplate.html");
const dailyTemplateSource = fs.readFileSync(dailyTemplatePath, "utf8");
const dailyDiaryTemplatePath = path.join(
  __dirname,
  "../../view/dailyDiary.html",
);
const dailyDiaryTemplateSource = fs.readFileSync(
  dailyDiaryTemplatePath,
  "utf8",
);
const invoiceTemplateSource = fs.readFileSync(
  path.join(__dirname, "../../view/invoiceReportTemplate.html"),
  "utf8",
);
const expenseTemplateSource = fs.readFileSync(
  path.join(__dirname, "../../view/expenseTemplate.html"),
  "utf8",
);
const JobHazardTemplateSource = fs.readFileSync(
  path.join(__dirname, "../../view/JobHazardTemplate.html"),
  "utf8",
);
const dailyTemplate = handlebars.compile(dailyTemplateSource);
const weeklyTemplate = handlebars.compile(weeklytemplateSource);
const dailyDiaryTemplate = handlebars.compile(dailyDiaryTemplateSource);
const invoiceReportTemplate = handlebars.compile(invoiceTemplateSource);
const expenseTemplate = handlebars.compile(expenseTemplateSource);
const JobHazardTemplate = handlebars.compile(JobHazardTemplateSource);



module.exports = {
  weeklyTemplate,
  dailyTemplate,
  dailyDiaryTemplate,
  invoiceReportTemplate,
  expenseTemplate,
  JobHazardTemplate
};
