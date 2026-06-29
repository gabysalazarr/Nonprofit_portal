const STORAGE_KEYS = {
  TEMPLATES: 'impacthub_templates',
  SUBMISSIONS: 'impacthub_submissions',
  REPORTS: 'impacthub_reports',
};
 
function getTemplates() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.TEMPLATES)) || [];
  } catch (e) {
    return [];
  }
}
 
function saveTemplates(templates) {
  localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
}
 
function addTemplate(template) {
  const templates = getTemplates();
  template.id = 'tpl_' + Date.now();
  template.createdAt = new Date().toISOString();
  templates.push(template);
  saveTemplates(templates);
  return template;
}
 
function getTemplateById(id) {
  return getTemplates().find(t => t.id === id);
}
 
function deleteTemplate(id) {
  const templates = getTemplates().filter(t => t.id !== id);
  saveTemplates(templates);
}
 
function getSubmissions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBMISSIONS)) || [];
  } catch (e) {
    return [];
  }
}
 
function saveSubmissions(submissions) {
  localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(submissions));
}
 
function addSubmission(submission) {
  const submissions = getSubmissions();
  submission.id = 'sub_' + Date.now();
  submission.submittedAt = new Date().toISOString();
  submission.status = submission.status || 'Pending';
  submissions.push(submission);
  saveSubmissions(submissions);
  return submission;
}
 
function getSubmissionsForTemplate(templateId) {
  return getSubmissions().filter(s => s.templateId === templateId);
}
 
function getSubmissionForOrg(templateId, orgName) {
  return getSubmissions().find(s => s.templateId === templateId && s.orgName === orgName);
}
 
function updateSubmissionStatus(submissionId, status) {
  const submissions = getSubmissions();
  const sub = submissions.find(s => s.id === submissionId);
  if (sub) {
    sub.status = status;
    saveSubmissions(submissions);
  }
  return sub;
}
 
// ── Reports (saved snapshots of a template's data, built in the Simple Report Builder) ──
function getReports() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.REPORTS)) || [];
  } catch (e) {
    return [];
  }
}
 
function saveReports(reports) {
  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
}
 
function addReport(report) {
  const reports = getReports();
  report.id = 'rep_' + Date.now();
  report.createdAt = new Date().toISOString();
  reports.push(report);
  saveReports(reports);
  return report;
}
 
function getReportById(id) {
  return getReports().find(r => r.id === id);
}
 
function deleteReport(id) {
  const reports = getReports().filter(r => r.id !== id);
  saveReports(reports);
}
 
// Demo helper: clears everything, useful while testing
function clearAllImpactHubData() {
  localStorage.removeItem(STORAGE_KEYS.TEMPLATES);
  localStorage.removeItem(STORAGE_KEYS.SUBMISSIONS);
  localStorage.removeItem(STORAGE_KEYS.REPORTS);
}