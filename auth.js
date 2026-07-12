// Runs on every protected page. Redirects to login if no valid token.
// Nav links marked adminOnly are hidden entirely for Employee accounts.
const NAV_LINKS = [
  { href: 'dashboard.html', label: 'Dashboard' },
  { href: 'organization.html', label: 'Organization', adminOnly: true },
  { href: 'assets.html', label: 'Assets' },
  { href: 'allocations.html', label: 'Allocation & Transfer' },
  { href: 'bookings.html', label: 'Resource Booking' },
  { href: 'maintenance.html', label: 'Maintenance' },
  { href: 'audits.html', label: 'Audit', adminOnly: true },
  { href: 'reports.html', label: 'Reports' },
  { href: 'notifications.html', label: 'Notifications' },
];

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('');
}

function isAdmin(user) {
  return user && user.role === 'Admin';
}

function renderShell(activeHref, contentHtml, user) {
  const admin = isAdmin(user);
  const links = NAV_LINKS.filter((l) => !l.adminOnly || admin);

  document.body.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="logo"><span class="logo-badge">A</span><span class="brand">AssetFlow</span></div>
        <nav>
          ${links.map(l => `<a href="${l.href}" class="${l.href === activeHref ? 'active' : ''}">${l.label}</a>`).join('')}
        </nav>
        <div class="user-box">
          <div class="avatar" id="userAvatar">?</div>
          <div class="info">
            <div class="name" id="userName">Loading...</div>
            <div class="role" id="userRole"></div>
          </div>
          <button id="logoutBtn">Exit</button>
        </div>
      </aside>
      <main class="content">${contentHtml}</main>
    </div>
  `;
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('assetflow_token');
    window.location.href = 'login.html';
  });
}

// Set requireAdmin = true on pages that are Admin-only (Organization, Audit).
// Employees who land there directly (e.g. via URL) get bounced to Dashboard.
async function guardPage(activeHref, contentHtml, { requireAdmin = false } = {}) {
  const token = localStorage.getItem('assetflow_token');
  if (!token) {
    window.location.href = 'login.html';
    return null;
  }
  renderShell(activeHref, '<p style="color:rgba(43,42,40,0.5)">Loading...</p>', null);
  try {
    const user = await api.get('/auth/me');
    if (requireAdmin && !isAdmin(user)) {
      window.location.href = 'dashboard.html';
      return null;
    }
    renderShell(activeHref, contentHtml, user);
    document.getElementById('userAvatar').textContent = initials(user.name);
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userRole').textContent = user.role;
    return user;
  } catch (err) {
    localStorage.removeItem('assetflow_token');
    window.location.href = 'login.html';
    return null;
  }
}

function statusBadgeClass(status) {
  const map = {
    Available: 'badge-green', Confirmed: 'badge-green', Approved: 'badge-green', Active: 'badge-green', Verified: 'badge-green', Resolved: 'badge-green',
    Allocated: 'badge-yellow', Reserved: 'badge-yellow', Pending: 'badge-yellow',
    'Under Maintenance': 'badge-coral', Damaged: 'badge-coral',
    Lost: 'badge-red', Rejected: 'badge-red', Missing: 'badge-red',
    Retired: 'badge-gray', Disposed: 'badge-gray', Cancelled: 'badge-gray', Returned: 'badge-gray',
  };
  return map[status] || 'badge-gray';
}

function badge(status) {
  return `<span class="badge ${statusBadgeClass(status)}">${status}</span>`;
}

function alertBox(message, type = 'success') {
  if (!message) return '';
  return `<div class="alert alert-${type}">${message}</div>`;
}
