// url.js - Check the URL simulation

document.addEventListener('DOMContentLoaded', function () {

    const API_BASE = 'https://securely-backend-xq4c.onrender.com';

    let userId = null;
    let urls = [];
    let index = 0;
    let score = 0;
    let answered = false;

    const els = {
        loading: document.getElementById('simLoading'),
        error: document.getElementById('simError'),
        errorText: document.getElementById('simErrorText'),
        content: document.getElementById('simContent'),
        progressText: document.getElementById('progressText'),
        scoreText: document.getElementById('scoreText'),
        progressFill: document.getElementById('progressFill'),
        urlText: document.getElementById('urlText'),
        pageTitle: document.getElementById('pageTitle'),
        contextNote: document.getElementById('contextNote'),
        btnFake: document.getElementById('btnFake'),
        btnReal: document.getElementById('btnReal'),
        feedback: document.getElementById('feedback'),
        nextBtn: document.getElementById('nextBtn')
    };


    // ============================================
    // Sidebar + nav
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
        window.location.href = 'resources.html';
    });
    document.getElementById('navSimulations')?.addEventListener('click', e => {
        e.preventDefault();
        window.location.href = 'simulations.html';
    });
    document.getElementById('navProfile')?.addEventListener('click', e => {
        e.preventDefault();
        window.location.href = 'profile.html';
    });
    document.getElementById('navSettings')?.addEventListener('click', e => {
        e.preventDefault();
        window.location.href = 'settings.html';
    });

    document.getElementById('logoutBtn')?.addEventListener('click', async e => {
        e.preventDefault();
        if (!confirm('Are you sure you want to logout?')) return;
        try {
            await fetch(`${API_BASE}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
        } catch (err) { console.error(err); }
        window.location.href = 'index.html';
    });


    // ============================================
    // Load user
    // ============================================

    async function loadUser() {
        try {
            const res = await fetch(`${API_BASE}/api/auth/me`, {
                credentials: 'include'
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                window.location.href = 'login.html';
                return false;
            }
            userId = data.data.id;
            const userNameEl = document.getElementById('userName');
            if (userNameEl && data.data.name) {
                userNameEl.textContent = data.data.name;
            }
            return true;
        } catch (err) {
            console.error(err);
            window.location.href = 'login.html';
            return false;
        }
    }


    // ============================================
    // Load URLs
    // ============================================

    async function loadUrls() {
        try {
            const res = await fetch(`${API_BASE}/api/simulations/url`, {
                credentials: 'include'
            });
            const data = await res.json();

            if (!data.success) throw new Error(data.message || 'Failed');

            urls = data.data || [];
            if (urls.length === 0) throw new Error('No URLs available');

            els.loading.style.display = 'none';
            els.content.style.display = 'block';
            renderUrl();
        } catch (err) {
            console.error(err);
            els.loading.style.display = 'none';
            els.error.style.display = 'block';
            els.errorText.textContent = err.message;
        }
    }


    // ============================================
    // Render one URL
    // ============================================

    function renderUrl() {
        const item = urls[index];
        answered = false;

        els.progressText.textContent = `URL ${index + 1} of ${urls.length}`;
        els.scoreText.textContent = `${score} correct`;
        els.progressFill.style.width = ((index / urls.length) * 100) + '%';

        els.urlText.textContent = item.url || '';
        els.pageTitle.textContent = item.page_title || '';
        els.contextNote.textContent = item.context_note || '';

        els.feedback.style.display = 'none';
        els.feedback.innerHTML = '';
        els.nextBtn.style.display = 'none';

        els.btnFake.disabled = false;
        els.btnReal.disabled = false;
    }


    // ============================================
    // Answer
    // ============================================

    async function answer(userSaidFake) {
        if (answered) return;
        answered = true;

        const item = urls[index];

        els.btnFake.disabled = true;
        els.btnReal.disabled = true;

        let result;
        try {
            const res = await fetch(`${API_BASE}/api/simulations/check`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: item.id,
                    userSaidThreat: userSaidFake
                })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            result = data.data;
        } catch (err) {
            console.error(err);
            answered = false;
            els.btnFake.disabled = false;
            els.btnReal.disabled = false;
            return;
        }

        if (result.correct) score++;
        els.scoreText.textContent = `${score} correct`;

        els.feedback.className = 'sim-feedback ' + (result.correct ? 'correct' : 'wrong');
        els.feedback.innerHTML = `
            <div class="sim-feedback-header">
                <i class="fas ${result.correct ? 'fa-check' : 'fa-times'}"></i>
                <span>${result.correct ? 'Correct' : 'Not quite'}</span>
            </div>
            <p class="sim-feedback-summary">
                This URL is <strong>${result.isThreat ? 'fake' : 'real'}</strong>.
            </p>
            <p class="sim-feedback-explanation">${result.explanation}</p>
        `;
        els.feedback.style.display = 'block';

        els.nextBtn.style.display = 'inline-flex';
        els.nextBtn.innerHTML = (index + 1 >= urls.length)
            ? 'Finish <i class="fas fa-check"></i>'
            : 'Next URL <i class="fas fa-arrow-right"></i>';
    }


    // ============================================
    // Next
    // ============================================

    function next() {
        if (index + 1 >= urls.length) {
            finish();
        } else {
            index++;
            renderUrl();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }


    // ============================================
    // Finish
    // ============================================

    async function finish() {
        const total = urls.length;
        const pct = Math.round((score / total) * 100);

        try {
            await fetch(`${API_BASE}/api/simulations/result`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    type: 'url',
                    score,
                    total
                })
            });
        } catch (err) {
            console.error('Could not save result:', err);
        }

        document.querySelector('.sim-view').innerHTML = `
            <div class="sim-finish">
                <div class="sim-finish-icon ${pct >= 70 ? 'passed' : 'failed'}">
                    <i class="fas ${pct >= 70 ? 'fa-trophy' : 'fa-redo'}"></i>
                </div>
                <h2>${pct >= 70 ? 'Well done!' : 'Keep practising'}</h2>
                <p>You scored <strong>${score} / ${total}</strong> (${pct}%)</p>
                <div class="sim-finish-actions">
                    <a href="simulations.html" class="sim-next">
                        <i class="fas fa-arrow-left"></i> Back to Simulations
                    </a>
                    <button onclick="location.reload()" class="sim-next">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </div>
            </div>
        `;
    }


    // ============================================
    // Wire buttons
    // ============================================

    els.btnFake.addEventListener('click', () => answer(true));
    els.btnReal.addEventListener('click', () => answer(false));
    els.nextBtn.addEventListener('click', next);


    // ============================================
    // Go
    // ============================================

    (async () => {
        if (!(await loadUser())) return;
        await loadUrls();
    })();
});