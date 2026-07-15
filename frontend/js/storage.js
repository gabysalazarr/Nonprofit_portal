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

// ── Reports ──
async function getReports() {
  return await apiFetch('/reports');
}

async function getReportById(id) {
  const reports = await getReports();
  return reports.find(r => r.id === id) || null;
}

async function getReportsVisibleTo(orgId) {
  return await apiFetch('/reports');
}

async function addReport(data) {
  const fileData = data.file ? await fileToBase64(data.file) : null;
  return await apiFetch('/reports', {
    method: 'POST',
    body: JSON.stringify({
      name:       data.name,
      file_name:  data.file ? data.file.name : null,
      file_data:  fileData,
      file_type:  data.file ? data.file.type : null,
      visible_to: data.visibleTo || ['all'],
    }),
  });
}

async function deleteReport(id) {
  return await apiFetch(`/reports/${id}`, { method: 'DELETE' });
}

async function downloadReport(id) {
  const r = await getReportById(id);
  if (!r || !r.file_data) return;
  downloadBase64File(r.file_data, r.file_name);
}

// ── Announcements ──
async function getAnnouncements() {
  return await apiFetch('/announcements');
}

async function addAnnouncement(data) {
  return await apiFetch('/announcements', {
    method: 'POST',
    body: JSON.stringify({
      author_name:     data.authorName,
      author_role:     data.authorRole,
      message:         data.message,
      audience:        data.audience,
      video_name:      data.videoName || null,
      attachment_name: data.attachmentName || null,
    }),
  });
}

async function deleteAnnouncement(id) {
  return await apiFetch(`/announcements/${id}`, { method: 'DELETE' });
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