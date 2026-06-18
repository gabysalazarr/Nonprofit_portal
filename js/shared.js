// Shared helpers used across pages

function sendChatMessage(inputId, threadId, senderInitials, avatarColor) {
  const input = document.getElementById(inputId);
  const text = input.value.trim();
  if (!text) return;
  const thread = document.getElementById(threadId);
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const bubble = document.createElement('div');
  bubble.className = 'bubble me';
  bubble.innerHTML = `
    <div class="b-avi" style="background:${avatarColor};">${senderInitials}</div>
    <div class="b-content">
      <div class="b-name">You</div>
      <div class="b-text">${escapeHtml(text)}</div>
      <div class="b-time">Today ${now}</div>
    </div>`;
  thread.appendChild(bubble);
  input.value = '';
  thread.scrollTop = thread.scrollHeight;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function toggleSwitch(el) {
  el.classList.toggle('on');
}

// Allow Enter key to submit chat inputs that have data-send attribute
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-send]').forEach(input => {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const [inputId, threadId, initials, color] = input.dataset.send.split('|');
        sendChatMessage(inputId, threadId, initials, color);
      }
    });
  });
});
