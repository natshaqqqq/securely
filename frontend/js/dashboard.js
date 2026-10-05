// dashboard.js - Dashboard page with cookie-based auth

document.addEventListener('DOMContentLoaded', async function () {

    const API_BASE = '';

    let userId = null;
    let userData = null;


    // ============================================
    // Check if user is logged in (via cookies)
    // ============================================

    async function checkLogin() {
        try {
            const response = await fetch(
                `${API_BASE}/api/auth/me`,
                {
                    method: 'GET',
                    credentials: 'include',              // ← send cookies
                    headers: { 'Accept': 'application/json' }
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                window.location.href = 'login.html';
                return false;
            }

            userData = result.data;
            userId = userData.id;
            return true;

        } catch (error) {
            console.error('Authentication check error:', error);
            window.location.href = 'login.html';
            return false;
        }
    }


    const isLoggedIn = await checkLogin();
    if (!isLoggedIn) return;


    // ============================================
    // Set user name in header
    // ============================================

    const userNameElement = document.getElementById('userName');
    if (userNameElement && userData && userData.name) {
        userNameElement.textContent = userData.name;
    }


    // ============================================
    // Load modules from database (via cookies)
    // ============================================

    async function loadModules() {
        try {
            const response = await fetch(
                `${API_BASE}/api/modules?userId=${userId}`,
                {
                    method: 'GET',
                    credentials: 'include',              // ← send cookies
                    headers: { 'Accept': 'application/json' }
                }
            );

            const result = await response.json();

            if (result.success) {
                const allModules = result.data || [];

                const pendingModules = allModules.filter(
                    m => !(m.completed === 1 || m.completed === true)
                );

                renderModules(pendingModules);
                updateStats(allModules);
            } else {
                showError('Failed to load lessons');
            }

        } catch (error) {
            console.error('Error loading modules:', error);
            showError('Connection error. Please try again.');
        }
    }

    window.loadModules = loadModules;


    // ============================================
    // Render modules
    // ============================================

    function renderModules(modules) {
        const grid = document.getElementById('lessonsGrid');

        if (!modules || modules.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-check-circle"></i>
                    <h3>All caught up!</h3>
                    <p>You've completed every lesson. Great work.</p>
                </div>
            `;
            return;
        }

        let html = modules.map(module => {
            const iconClass = module.icon_class || 'fas fa-book';
            const title = module.name || module.title || 'Untitled';
            const description = module.description || 'Learn about this topic';

            return `
                <div class="lesson-card">
                    <div class="lesson-icon">
                        <i class="${iconClass}"></i>
                    </div>
                    <h3 class="lesson-title">${title}</h3>
                    <p class="lesson-desc">${description}</p>
                    <button
                        class="lesson-btn"
                        data-module-id="${module.id}"
                        onclick="startLesson(${module.id})"
                    >
                        <i class="fas fa-play"></i>
                        Start Lesson
                    </button>
                </div>
            `;
        }).join('');

        grid.innerHTML = html;
    }


    // ============================================
    // Update stats
    // ============================================

    function updateStats(allModules) {
        const completed = allModules.filter(
            m => m.completed === 1 || m.completed === true
        ).length;

        const totalPoints = allModules.reduce(
            (sum, m) => sum + ((m.completed === 1 || m.completed === true)
                ? (m.points_reward || 0)
                : 0),
            0
        );

        const completedEl = document.getElementById('completedCount');
        if (completedEl) completedEl.textContent = completed;

        const pointsEl = document.getElementById('pointsCount');
        if (pointsEl) pointsEl.textContent = totalPoints;
    }


    // ============================================
    // Start lesson
    // ============================================

    window.startLesson = function (moduleId) {
        window.location.href = `module-content.html?id=${moduleId}`;
    };


    // ============================================
    // Toast
    // ============================================

    function showToast(message, type = 'info') {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        toast.style.cssText = `
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            background: #0a1e3c;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 1rem;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            z-index: 1000;
            font-size: 0.95rem;
            border-left: 4px solid ${
                type === 'success' ? '#22c55e'
                : type === 'error' ? '#ef4444'
                : '#6c5ce7'
            };
            animation: slideIn 0.3s ease;
            max-width: 400px;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }


    // ============================================
    // Error state
    // ============================================

    function showError(message) {
        const grid = document.getElementById('lessonsGrid');
        grid.innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Error loading lessons</h3>
                <p>${message}</p>
                <button onclick="loadModules()" class="retry-btn">Retry</button>
            </div>
        `;
    }


    // ============================================
    // Mobile menu toggle
    // ============================================

    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (menuToggle && sidebar && overlay) {
        menuToggle.addEventListener('click', function () {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        });

        overlay.addEventListener('click', function () {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });

        window.addEventListener('resize', function () {
            if (window.innerWidth > 768) {
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
            }
        });
    }


    // ============================================
    // Sidebar navigation
    // ============================================

    const dashboardLink = document.getElementById('navDashboard');
    if (dashboardLink) {
        dashboardLink.addEventListener('click', function (e) {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    const lessonLink = document.getElementById('navLesson');
    if (lessonLink) {
        lessonLink.addEventListener('click', function (e) {
            e.preventDefault();
            window.location.href = 'modules.html';
        });
    }

    const resourcesLink = document.getElementById('navResources');
    if (resourcesLink) {
        resourcesLink.addEventListener('click', function (e) {
            e.preventDefault();
            window.location.href = 'resources.html';
        });
    }

    const simulationsLink = document.getElementById('navSimulations');
    if (simulationsLink) {
        simulationsLink.addEventListener('click', function (e) {
            e.preventDefault();
            window.location.href = 'simulations.html';
        });
    }

    const profileLink = document.getElementById('navProfile');
    if (profileLink) {
        profileLink.addEventListener('click', function (e) {
            e.preventDefault();
            window.location.href = 'profile.html';
        });
    }

    const settingsLink = document.getElementById('navSettings');
    if (settingsLink) {
        settingsLink.addEventListener('click', function (e) {
            e.preventDefault();
            window.location.href = 'settings.html';
        });
    }


    // ============================================
    // Logout (cookie-based)
    // ============================================

    const logoutBtn = document.getElementById('logoutBtn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function (e) {
            e.preventDefault();

            if (!confirm('Are you sure you want to logout?')) return;

            try {
                await fetch(`${API_BASE}/api/auth/logout`, {
                    method: 'POST',
                    credentials: 'include',           // ← send cookies so server clears them
                    headers: { 'Accept': 'application/json' }
                });
            } catch (err) {
                console.error('Logout error:', err);
            }

            // Clear any leftover localStorage entries from old auth
            localStorage.removeItem('securely_token');
            localStorage.removeItem('securely_user');
            localStorage.removeItem('securely_verified');
            localStorage.removeItem('securely_remember_email');

            window.location.href = 'index.html';
        });
    }


    // ============================================
    // Initial load
    // ============================================

    await loadModules();

});
