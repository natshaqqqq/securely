// sms.js - Scam SMS simulation

document.addEventListener('DOMContentLoaded', function () {

    const API_BASE = 'http://127.0.0.1:3000';

    let userId = null;
    let messages = [];
    let index = 0;
    let score = 0;
    let answered = false;

    const els = {
        loading: document.getElementById('simLoading'),
        error: document.getElementById('simError'),
        errorText: document.getElementById('simErrorText'),
        content: document.getElementById('simContent'),
        intro: document.getElementById('smsIntro'),
        progressText: document.getElementById('progressText'),
        scoreText: document.getElementById('scoreText'),
        progressFill: document.getElementById('progressFill'),
        senderName: document.getElementById('smsSenderName'),
        senderAddress: document.getElementById('smsSenderAddress'),
        timestamp: document.getElementById('smsTimestamp'),
        bubble: document.getElementById('smsBubble'),
        btnScam: document.getElementById('btnScam'),
        btnLegit: document.getElementById('btnLegit'),
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
    // Load messages
    // ============================================

    async function loadMessages() {
        try {
            const res = await fetch(`${API_BASE}/api/simulations/sms`, {
                credentials: 'include'
            });
            const data = await res.json();

            if (!data.success) throw new Error(data.message || 'Failed');

            messages = data.data || [];
            if (messages.length === 0) throw new Error('No messages available');

            els.loading.style.display = 'none';
            els.content.style.display = 'block';
            renderMessage();
        } catch (err) {
            console.error(err);
            els.loading.style.display = 'none';
            els.error.style.display = 'block';
            els.errorText.textContent = err.message;
        }
    }


    // ============================================
    // Render one message
    // ============================================

    function renderMessage() {
        const msg = messages[index];
        answered = false;

        els.progressText.textContent = `Message ${index + 1} of ${messages.length}`;
        els.scoreText.textContent = `${score} correct`;
        els.progressFill.style.width = ((index / messages.length) * 100) + '%';

        // Show the sender address (number, shortcode, or alpha) as the main label
        els.senderName.textContent = msg.sender_address || 'Unknown';
        els.senderAddress.textContent = '';

        els.timestamp.textContent = msg.timestamp_label || '';
        els.bubble.innerHTML = msg.body_html || '';

        els.bubble.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', e => e.preventDefault());
            a.style.cursor = 'default';
        });

        els.feedback.style.display = 'none';
        els.feedback.innerHTML = '';
        els.nextBtn.style.display = 'none';

        els.btnScam.disabled = false;
        els.btnLegit.disabled = false;
    }


    // ============================================
    // Answer
    // ============================================

    async function answer(userSaidScam) {
        if (answered) return;
        answered = true;

        if (els.intro) els.intro.style.display = 'none';

        const msg = messages[index];

        els.btnScam.disabled = true;
        els.btnLegit.disabled = true;

        let result;
        try {
            const res = await fetch(`${API_BASE}/api/simulations/check`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: msg.id,
                    userSaidThreat: userSaidScam
                })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            result = data.data;
        } catch (err) {
            console.error(err);
            answered = false;
            els.btnScam.disabled = false;
            els.btnLegit.disabled = false;
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
                This message is <strong>${result.isThreat ? 'a scam' : 'legitimate'}</strong>.
            </p>
            <p class="sim-feedback-explanation">${result.explanation}</p>
        `;
        els.feedback.style.display = 'block';

        els.nextBtn.style.display = 'inline-flex';
        els.nextBtn.innerHTML = (index + 1 >= messages.length)
            ? 'Finish <i class="fas fa-check"></i>'
            : 'Next Message <i class="fas fa-arrow-right"></i>';
    }


    // ============================================
    // Next
    // ============================================

    function next() {
        if (index + 1 >= messages.length) {
            finish();
        } else {
            index++;
            renderMessage();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }


    // ============================================
    // Finish
    // ============================================

    async function finish() {
        const total = messages.length;
        const pct = Math.round((score / total) * 100);

        try {
            await fetch(`${API_BASE}/api/simulations/result`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    type: 'sms',
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

    els.btnScam.addEventListener('click', () => answer(true));
    els.btnLegit.addEventListener('click', () => answer(false));
    els.nextBtn.addEventListener('click', next);


    // ============================================
    // Go
    // ============================================

    (async () => {
        if (!(await loadUser())) return;
        await loadMessages();
    })();
});