// resources.js - Loads cybersecurity resources from the DB (cookie-based auth)

document.addEventListener('DOMContentLoaded', async function () {

    const API_BASE = '';

    let userData = null;
    let resourcesById = {};

    // ============================================
    // Login check (via cookie)
    // ============================================

    async function checkLogin() {
        try {
            const res = await fetch(`${API_BASE}/api/auth/me`, {
                method: 'GET',
                credentials: 'include',              // ← send cookie
                headers: { 'Accept': 'application/json' }
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                window.location.href = 'login.html';
                return false;
            }

            userData = data.data;
            return true;

        } catch (err) {
            console.error(err);
            window.location.href = 'login.html';
            return false;
        }
    }

    if (!(await checkLogin())) return;

    const userNameEl = document.getElementById('userName');
    if (userNameEl && userData?.name) userNameEl.textContent = userData.name;


    // ============================================
    // Load resources
    // ============================================

    async function loadResources() {
        const loading = document.getElementById('resourcesLoading');
        const errEl = document.getElementById('resourcesError');

        loading.style.display = 'flex';
        errEl.style.display = 'none';

        try {
            const res = await fetch(`${API_BASE}/api/resources`, {
                method: 'GET',
                credentials: 'include',              // ← send cookie
                headers: { 'Accept': 'application/json' }
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Failed');

            const all = data.data.all || [];
            const grouped = data.data.grouped || {};

            resourcesById = Object.fromEntries(all.map(r => [r.id, r]));

            renderGroup('orgGrid',   grouped.organization || [], 'organisation');
            renderGroup('newsGrid',  grouped.news || []);
            renderGroup('toolsGrid', grouped.tool || []);

            loading.style.display = 'none';

        } catch (err) {
            console.error(err);
            loading.style.display = 'none';
            errEl.style.display = 'block';
            document.getElementById('resourcesErrorText').textContent = err.message;
        }
    }

    window.loadResources = loadResources;


    // ============================================
    // Render a group of cards
    // ============================================

    function renderGroup(gridId, items, extraClass = '') {
        const grid = document.getElementById(gridId);
        if (!grid) return;

        if (!items.length) {
            grid.innerHTML = '<p class="resources-empty">None yet.</p>';
            return;
        }

        grid.innerHTML = items.map(r => `
            <div class="resource-card ${extraClass}" data-resource-id="${r.id}">
                <div class="resource-card-body">
                    <h3>${r.title}</h3>
                    ${r.description ? `<p>${r.description}</p>` : ''}
                    <span class="resource-cta">
                        Learn More <i class="fas fa-arrow-right"></i>
                    </span>
                </div>
            </div>
        `).join('');

        grid.querySelectorAll('.resource-card').forEach(card => {
            card.addEventListener('click', () => {
                openResourceModal(Number(card.dataset.resourceId));
            });
        });
    }


    // ============================================
    // Modal
    // ============================================

    function openResourceModal(id) {
        const r = resourcesById[id];
        if (!r) return;

        document.getElementById('modalTitle').textContent = r.title;

        const services = r.services
            ? r.services.split(',').map(s => s.trim()).filter(Boolean)
            : [];

        document.getElementById('modalBody').innerHTML = `
            ${r.long_description
                ? `<p class="modal-long-desc">${r.long_description}</p>`
                : r.description
                    ? `<p class="modal-long-desc">${r.description}</p>`
                    : ''}

            ${services.length
                ? `<h4 class="modal-section-heading">What They Do</h4>
                   <ul class="modal-services">
                       ${services.map(s => `<li>${s}</li>`).join('')}
                   </ul>`
                : ''}
        `;

        const visitBtn = document.getElementById('modalVisitBtn');
        visitBtn.href = r.url;

        const modal = document.getElementById('resourceModal');
        modal.style.display = 'flex';
        requestAnimationFrame(() => modal.classList.add('open'));
        document.body.style.overflow = 'hidden';
    }

    function closeResourceModal() {
        const modal = document.getElementById('resourceModal');
        if (!modal || modal.style.display === 'none') return;

        modal.classList.remove('open');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }, 200);
    }

    document.addEventListener('click', e => {
        if (e.target.closest('[data-close-modal]')) closeResourceModal();
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeResourceModal();
    });


    // ============================================
    // Mobile sidebar + nav
    // ============================================

    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (menuToggle && sidebar && overlay) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        });
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });
    }

    document.getElementById('navDashboard')?.addEventListener('click', e => {
        e.preventDefault();
        window.location.href = 'dashboard.html';
    });
    document.getElementById('navLesson')?.addEventListener('click', e => {
        e.preventDefault();
        window.location.href = 'modules.html';
    });
    document.getElementById('navResources')?.addEventListener('click', e => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.getElementById('navProfile')?.addEventListener('click', e => {
        e.preventDefault();
        window.location.href = 'profile.html';
    });
    document.getElementById('navSettings')?.addEventListener('click', e => {
        e.preventDefault();
        window.location.href = 'settings.html';
    });

    document.getElementById('navSimulations')?.addEventListener('click', function (e) {
        e.preventDefault();
        window.location.href = 'simulations.html';
    });


    // ============================================
    // Logout (clears cookie on server)
    // ============================================

    document.getElementById('logoutBtn')?.addEventListener('click', async e => {
        e.preventDefault();
        if (!confirm('Are you sure you want to logout?')) return;

        try {
            await fetch(`${API_BASE}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include'                // ← send cookie so server clears it
            });
        } catch (err) {
            console.error('Logout error:', err);
        }

        // Clear any leftover localStorage entries
        localStorage.removeItem('securely_token');
        localStorage.removeItem('securely_user');
        localStorage.removeItem('securely_remember_email');

        window.location.href = 'index.html';
    });


    // ============================================
    // Go
    // ============================================

    await loadResources();
});
