const API = 'http://localhost:3000/api';

function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  try { return JSON.parse(localStorage.getItem('user')); }
  catch(e) { return null; }
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    // Token expired — redirect to login
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../index.html';
    return null;
  }
  return res.json();
}

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

// ── Templates ──
async function getTemplates() {
  return await apiFetch('/templates');
}

async function getTemplateById(id) {
  return await apiFetch(`/templates/${id}`);
}

async function getTemplatesForOrg(orgId) {
  return await apiFetch('/templates');
}

async function addTemplate(data) {
  const fileData = data.file ? await fileToBase64(data.file) : null;
  return await apiFetch('/templates', {
    method: 'POST',
    body: JSON.stringify({
      name:             data.name,
      due_date:         data.dueDate,
      file_name:        data.file ? data.file.name : null,
      file_data:        fileData,
      file_type:        data.file ? data.file.type : null,
      method:           data.method || 'upload',
      fields:           data.fields || null,
      assigned_org_ids: data.assignedOrgIds || [],
    }),
  });
}

async function deleteTemplate(id) {
  return await apiFetch(`/templates/${id}`, { method: 'DELETE' });
}

async function downloadTemplate(id) {
  const t = await getTemplateById(id);
  if (!t || !t.file_data) return;
  downloadBase64File(t.file_data, t.file_name);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Submissions ──
async function getSubmissions() {
  return await apiFetch('/submissions');
}

async function getSubmissionsForOrg(orgId) {
  const all = await getSubmissions();
  return all.filter(s => s.org_id === orgId);
}

async function getSubmissionsForTemplate(templateId) {
  const all = await getSubmissions();
  return all.filter(s => s.template_id === templateId);
}

async function getSubmissionForOrg(templateId, orgId) {
  const all = await getSubmissions();
  return all.find(s => s.template_id === templateId && s.org_id === orgId) || null;
}

async function addSubmission(data) {
  const fileData = data.file ? await fileToBase64(data.file) : null;
  return await apiFetch('/submissions', {
    method: 'POST',
    body: JSON.stringify({
      template_id:  data.templateId,
      role:         data.role,
      file_name:    data.file ? data.file.name : null,
      file_data:    fileData,
      file_type:    data.file ? data.file.type : null,
      report_name:  data.reportName || null,
      answers:      data.answers || null,
    }),
  });
}

async function updateSubmissionStatus(id, status, rejectionComment) {
  return await apiFetch(`/submissions/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, rejection_comment: rejectionComment || null }),
  });
}

async function downloadSubmission(id) {
  const all = await getSubmissions();
  const s = all.find(s => s.id === id);
  if (!s || !s.file_data) return;
  downloadBase64File(s.file_data, s.file_name);
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

// ── Organizations ──
async function getOrganizations() {
  return await apiFetch('/organizations');
}

async function getOrganizationsByRole(role) {
  return await apiFetch(`/organizations/role/${role}`);
}

async function createOrganization(data) {
  return await apiFetch('/organizations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

async function updateOrgStatus(id, status) {
  return await apiFetch(`/organizations/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

async function deleteOrganization(id) {
  return await apiFetch(`/organizations/${id}`, {
    method: 'DELETE',
  });
}