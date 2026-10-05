// simulations.js - Hub nav + cards loaded from API (cookie-based auth)

document.addEventListener('DOMContentLoaded', async function () {

    const API_BASE = 'http://127.0.0.1:3000';

    // ============================================
    // Login check (via cookie)
    // ============================================

    let userData = null;

    try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
            method: 'GET',
            credentials: 'include',              // ← send cookie
            headers: { 'Accept': 'application/json' }
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
            window.location.href = 'login.html';
            return;
        }
        userData = data.data;

    } catch (err) {
        console.error(err);
        window.location.href = 'login.html';
        return;
    }

    const userNameEl = document.getElementById('userName');
    if (userNameEl && userData?.name) userNameEl.textContent = userData.name;


    // ============================================
    // Sidebar toggle
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


    // ============================================
    // Nav links
    // ============================================

    document.getElementById('navDashboard')?.addEventListener('click', e => { e.preventDefault(); window.location.href = 'dashboard.html'; });
    document.getElementById('navLesson')?.addEventListener('click', e => { e.preventDefault(); window.location.href = 'modules.html'; });
    document.getElementById('navResources')?.addEventListener('click', e => { e.preventDefault(); window.location.href = 'resources.html'; });
    document.getElementById('navSimulations')?.addEventListener('click', e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    document.getElementById('navProfile')?.addEventListener('click', e => { e.preventDefault(); window.location.href = 'profile.html'; });
    document.getElementById('navSettings')?.addEventListener('click', e => { e.preventDefault(); window.location.href = 'settings.html'; });


    // ============================================
    // Logout (clears cookie on server)
    // ============================================

    document.getElementById('logoutBtn')?.addEventListener('click', async e => {
        e.preventDefault();
        if (!confirm('Are you sure you want to logout?')) return;

        try {
            await fetch(`${API_BASE}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include'             // ← let server clear cookie
            });
        } catch (err) {
            console.error('Logout error:', err);
        }

        localStorage.removeItem('securely_token');
        localStorage.removeItem('securely_user');
        localStorage.removeItem('securely_remember_email');

        window.location.href = 'index.html';
    });


    // ============================================
    // Load hub cards
    // ============================================

    const loading = document.getElementById('simLoading');
    const errorEl = document.getElementById('simError');
    const errorText = document.getElementById('simErrorText');
    const grid = document.getElementById('simGrid');

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    try {
        const res = await fetch(`${API_BASE}/api/simulations`, {
            method: 'GET',
            credentials: 'include',            // ← send cookie
            headers: { 'Accept': 'application/json' }
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Failed');

        const cards = data.data || [];
        if (cards.length === 0) throw new Error('No simulations available');

        grid.innerHTML = cards.map(card => `
            <a href="${escapeHtml(card.page_url)}" class="sim-hub-card">
                <h3>${escapeHtml(card.title)}</h3>
                <p>${escapeHtml(card.description)}</p>
                <span class="sim-hub-cta">Open <i class="fas fa-arrow-right"></i></span>
            </a>
        `).join('');

        loading.style.display = 'none';
        grid.style.display = 'grid';

    } catch (err) {
        console.error(err);
        loading.style.display = 'none';
        errorEl.style.display = 'block';
        errorText.textContent = err.message;
    }
});