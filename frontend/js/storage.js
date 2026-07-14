const STORAGE_KEYS = {
  TEMPLATES:     'impacthub_templates',
  SUBMISSIONS:   'impacthub_submissions',
  REPORTS:       'impacthub_reports',
  ANNOUNCEMENTS: 'impacthub_announcements',
};

// ── Utility ──────────────────────────────────────────────

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function downloadBase64File(base64DataUrl, filename) {
  const a = document.createElement('a');
  a.href = base64DataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      alert('Storage limit reached. File is too large for this demo. Please use a file under 2MB.');
    }
    return false;
  }
}

function safeGet(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch (e) {
    return [];
  }
}

// ── Templates ─────────────────────────────────────────────
// Stored by manager. Nonprofits download and fill out offline, then upload as submissions.
// Shape: { id, name, dueDate, assignedOrgs, fileName, fileType, fileData, createdAt }

function getTemplates() {
  return safeGet(STORAGE_KEYS.TEMPLATES);
}

async function addTemplate({ name, dueDate, assignedOrgs, file }) {
  const templates = getTemplates();
  const fileData = await readFileAsBase64(file);
  const template = {
    id:           'tpl_' + Date.now(),
    name,
    dueDate,
    assignedOrgs: assignedOrgs || [],
    fileName:     file.name,
    fileType:     file.type,
    fileData,
    createdAt:    new Date().toISOString(),
  };
  templates.push(template);
  const ok = safeSet(STORAGE_KEYS.TEMPLATES, templates);
  return ok ? template : null;
}

function getTemplateById(id) {
  return getTemplates().find(t => t.id === id) || null;
}

function getTemplatesForOrg(orgName) {
  return getTemplates().filter(t => t.assignedOrgs.includes(orgName));
}

function deleteTemplate(id) {
  safeSet(STORAGE_KEYS.TEMPLATES, getTemplates().filter(t => t.id !== id));
}

function downloadTemplate(id) {
  const t = getTemplateById(id);
  if (!t) return alert('Template not found.');
  downloadBase64File(t.fileData, t.fileName);
}

// ── Submissions ───────────────────────────────────────────
// Uploaded by nonprofits after filling out a template offline.
// Shape: { id, templateId, orgName, role, fileName, fileType, fileData, status, submittedAt }

function getSubmissions() {
  return safeGet(STORAGE_KEYS.SUBMISSIONS);
}

async function addSubmission({ templateId, orgName, role, file, reportName }) {
  const submissions = getSubmissions();
  const fileData = await readFileAsBase64(file);
  const submission = {
    id:          'sub_' + Date.now(),
    templateId,
    orgName,
    role:        role || 'nonprofit',
    fileName:    file.name,
    fileType:    file.type,
    fileData,
    reportName:  reportName ||'',
    status:      'Pending',
    submittedAt: new Date().toISOString(),
  };
  submissions.push(submission);
  const ok = safeSet(STORAGE_KEYS.SUBMISSIONS, submissions);
  return ok ? submission : null;
}

function getSubmissionsForTemplate(templateId) {
  return getSubmissions().filter(s => s.templateId === templateId);
}

function getSubmissionForOrg(templateId, orgName) {
  return getSubmissions().find(s => s.templateId === templateId && s.orgName === orgName) || null;
}

function getSubmissionsForOrg(orgName) {
  return getSubmissions().filter(s => s.orgName === orgName);
}

function updateSubmissionStatus(submissionId, status) {
  const submissions = getSubmissions();
  const sub = submissions.find(s => s.id === submissionId);
  if (sub) {
    sub.status = status;
    safeSet(STORAGE_KEYS.SUBMISSIONS, submissions);
  }
  return sub;
}

function downloadSubmission(id) {
  const sub = getSubmissions().find(s => s.id === id);
  if (!sub) return alert('Submission not found.');
  downloadBase64File(sub.fileData, sub.fileName);
}

// ── Reports ───────────────────────────────────────────────
// Uploaded directly by the manager (standalone, not tied to a submission).
// Nonprofit/community submissions also appear in Reports view but live in Submissions.
// Shape: { id, name, fileName, fileType, fileData, visibleTo, uploadedAt }
// visibleTo: array of org names or ['all']

function getReports() {
  return safeGet(STORAGE_KEYS.REPORTS);
}

async function addReport({ name, file, visibleTo }) {
  const reports = getReports();
  const fileData = await readFileAsBase64(file);
  const report = {
    id:         'rep_' + Date.now(),
    name,
    fileName:   file.name,
    fileType:   file.type,
    fileData,
    visibleTo:  visibleTo || ['all'],
    uploadedAt: new Date().toISOString(),
  };
  reports.push(report);
  const ok = safeSet(STORAGE_KEYS.REPORTS, reports);
  return ok ? report : null;
}

function getReportById(id) {
  return getReports().find(r => r.id === id) || null;
}

function getReportsVisibleTo(orgName) {
  return getReports().filter(r =>
    r.visibleTo.includes('all') || r.visibleTo.includes(orgName)
  );
}

function updateReportVisibility(reportId, visibleTo) {
  const reports = getReports();
  const report = reports.find(r => r.id === reportId);
  if (report) {
    report.visibleTo = visibleTo;
    safeSet(STORAGE_KEYS.REPORTS, reports);
  }
  return report;
}

function deleteReport(id) {
  safeSet(STORAGE_KEYS.REPORTS, getReports().filter(r => r.id !== id));
}

function downloadReport(id) {
  const r = getReportById(id);
  if (!r) return alert('Report not found.');
  downloadBase64File(r.fileData, r.fileName);
}

// ── Announcements ─────────────────────────────────────────
// Shared board visible to all roles. Anyone can post.
// Shape: { id, authorName, authorRole, message, postedAt }

function getAnnouncements() {
  return safeGet(STORAGE_KEYS.ANNOUNCEMENTS);
}

function addAnnouncement({ authorName, authorRole, message, audience, videoName, attachmentName }) {
  const announcements = getAnnouncements();
  const announcement = {
    id:        'ann_' + Date.now(),
    authorName,
    authorRole,
    message,
    audience,
    videoName: videoName || null,
    attachmentName: attachmentName || null,
    postedAt:  new Date().toISOString(),
  };
  announcements.unshift(announcement);
  safeSet(STORAGE_KEYS.ANNOUNCEMENTS, announcements);
  return announcement;
}

function deleteAnnouncement(id) {
  safeSet(STORAGE_KEYS.ANNOUNCEMENTS, getAnnouncements().filter(a => a.id !== id));
}

// ── Shared helpers ────────────────────────────────────────

function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

function getStatusPillClass(status) {
  switch ((status || '').toLowerCase()) {
    case 'approved':  return 'pill-green';
    case 'in review': return 'pill-amber';
    case 'rejected':  return 'pill-red';
    default:          return 'pill-gray';
  }
}

// Demo reset — clears ALL stored data
function clearAllImpactHubData() {
  Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
  alert('All demo data cleared.');
}