// password.js - Real-time password strength checker

document.addEventListener('DOMContentLoaded', function () {

    const API_BASE = 'https://securely-backend-xq4c.onrender.com';


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
    // Auth + user name
    // ============================================

    (async () => {
        try {
            const res = await fetch(`${API_BASE}/api/auth/me`, {
                credentials: 'include'
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                window.location.href = 'login.html';
                return;
            }
            const userNameEl = document.getElementById('userName');
            if (userNameEl && data.data?.name) {
                userNameEl.textContent = data.data.name;
            }
        } catch (err) {
            console.error(err);
            window.location.href = 'login.html';
        }
    })();


    // ============================================
    // Password strength logic
    // ============================================

    const input = document.getElementById('passwordInput');
    const bar = document.getElementById('passwordBar');
    const label = document.getElementById('passwordLabel');
    const toggle = document.getElementById('togglePassword');

    const COMMON_PASSWORDS = [
        'password', 'password1', 'password123',
        '123456', '12345678', '123456789', '1234567890',
        'qwerty', 'qwerty123', 'abc123', 'letmein', 'welcome',
        'admin', 'iloveyou', 'monkey', 'dragon', 'sunshine',
        'princess', 'football', 'baseball', 'master', 'shadow',
        '123123', '111111', '000000', 'admin123', 'root',
        'pass', 'pass123', 'test', 'test123'
    ];

    const SEQUENCES = [
        'abc', 'bcd', 'cde', 'def', 'efg', 'fgh', 'ghi', 'hij', 'ijk',
        'jkl', 'klm', 'lmn', 'mno', 'nop', 'opq', 'pqr', 'qrs', 'rst',
        'stu', 'tuv', 'uvw', 'vwx', 'wxy', 'xyz',
        '123', '234', '345', '456', '567', '678', '789', '890'
    ];

    function check(pw) {
        const lower = pw.toLowerCase();

        const rules = {
            length:   pw.length >= 12,
            upper:    /[A-Z]/.test(pw),
            lower:    /[a-z]/.test(pw),
            number:   /[0-9]/.test(pw),
            symbol:   /[^A-Za-z0-9]/.test(pw),
            common:   pw.length > 0 && !COMMON_PASSWORDS.includes(lower),
            repeat:   pw.length > 0 && !/(.)\1{2,}/.test(pw),
            sequence: pw.length > 0 && !SEQUENCES.some(s => lower.includes(s))
        };

        const passed = Object.values(rules).filter(Boolean).length;

        // Update the checklist
        document.querySelectorAll('.password-checks li').forEach(li => {
            const key = li.dataset.check;
            const icon = li.querySelector('i');
            if (rules[key]) {
                li.classList.add('ok');
                li.classList.remove('fail');
                icon.className = 'fas fa-check-circle';
            } else {
                li.classList.remove('ok');
                li.classList.add('fail');
                icon.className = 'fas fa-circle';
            }
        });

        // Score 0 to 100
        let score = 0;
        let text = '';
        let color = '';

        if (pw.length === 0) {
            score = 0;
            text = 'Start typing to check';
            color = '#9ca3af';
        } else if (passed <= 2) {
            score = 20;
            text = 'Very Weak';
            color = '#ef4444';
        } else if (passed <= 4) {
            score = 40;
            text = 'Weak';
            color = '#f97316';
        } else if (passed <= 6) {
            score = 60;
            text = 'Fair';
            color = '#f59e0b';
        } else if (passed <= 7) {
            score = 80;
            text = 'Strong';
            color = '#10b981';
        } else {
            score = 100;
            text = 'Very Strong';
            color = '#059669';
        }

        // If password is common, always force Very Weak
        if (pw.length > 0 && COMMON_PASSWORDS.includes(lower)) {
            score = 10;
            text = 'Very Weak (common password)';
            color = '#ef4444';
        }

        bar.style.width = score + '%';
        bar.style.background = color;
        label.textContent = text;
        label.style.color = color;
    }

    input.addEventListener('input', e => check(e.target.value));

    toggle.addEventListener('click', () => {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        toggle.innerHTML = `<i class="fas ${isPassword ? 'fa-eye-slash' : 'fa-eye'}"></i>`;
    });

    // Initial state
    check('');
});