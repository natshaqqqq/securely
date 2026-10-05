// script.js - Securely interactivity and navigation

document.addEventListener('DOMContentLoaded', function() {
    // Update footer year
    const yearElement = document.getElementById('year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }

    // ============================================
    // Navigation Functions
    // ============================================
    
    // Get Started button - always goes to Register
    const getStartedBtn = document.querySelector('.btn-outline');
    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'register.html';
        });
    }

    // Start my training button - goes to Register
    const startBtn = document.querySelector('.btn-primary');
    if (startBtn) {
        startBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'register.html';
        });
    }

    // Resume training link - goes to Login
    const resumeLink = document.querySelector('.link');
    if (resumeLink) {
        resumeLink.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'login.html';
        });
    }

    // ============================================
    // Toast Notification System
    // ============================================
    function showToast(message, type = 'info') {
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 400);
        }, 3000);
    }

    // ============================================
    // Auth Status Check - ONLY for protected pages
    // ============================================
    function checkAuthStatus() {
        const userId = localStorage.getItem('securely_user_id');
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        
        // DON'T do anything on index page - keep it public
        if (currentPage === 'index.html' || currentPage === '' || currentPage === '/') {
            console.log('📄 Index page - public content');
            return;
        }
        
        // If not logged in and trying to access protected pages
        if (!userId) {
            const protectedPages = ['dashboard.html', 'profile.html', 'settings.html'];
            if (protectedPages.includes(currentPage)) {
                console.log('🔒 Not logged in - redirecting to login');
                window.location.href = 'login.html';
            }
            return;
        }
        
        // User IS logged in - redirect auth pages to dashboard
        console.log('✅ User is logged in:', userId);
        const authPages = ['login.html', 'register.html', 'verify.html'];
        if (authPages.includes(currentPage)) {
            console.log('🔄 Already logged in - redirecting to dashboard');
            window.location.href = 'dashboard.html';
            return;
        }
        
        // Update navigation for logged-in users (only on non-index pages)
        const getStartedBtn = document.querySelector('.btn-outline');
        const startBtn = document.querySelector('.btn-primary');
        const resumeLink = document.querySelector('.link');
        
        if (getStartedBtn && currentPage !== 'index.html') {
            getStartedBtn.textContent = 'Dashboard';
            const newGetStarted = getStartedBtn.cloneNode(true);
            getStartedBtn.parentNode.replaceChild(newGetStarted, getStartedBtn);
            newGetStarted.addEventListener('click', function(e) {
                e.preventDefault();
                window.location.href = 'dashboard.html';
            });
        }
        
        if (startBtn && currentPage !== 'index.html') {
            startBtn.textContent = 'Continue Training';
            const newStartBtn = startBtn.cloneNode(true);
            startBtn.parentNode.replaceChild(newStartBtn, startBtn);
            newStartBtn.addEventListener('click', function(e) {
                e.preventDefault();
                window.location.href = 'dashboard.html';
            });
        }
        
        if (resumeLink && currentPage !== 'index.html') {
            resumeLink.innerHTML = 'Welcome back! <strong>Go to Dashboard</strong>';
            const newResumeLink = resumeLink.cloneNode(true);
            resumeLink.parentNode.replaceChild(newResumeLink, resumeLink);
            newResumeLink.addEventListener('click', function(e) {
                e.preventDefault();
                window.location.href = 'dashboard.html';
            });
        }
    }

    // Call auth status check
    checkAuthStatus();

    // ============================================
    // Logout Function
    // ============================================
    function logout() {
        localStorage.removeItem('securely_user_id');
        localStorage.removeItem('securely_user');
        localStorage.removeItem('securely_user_email');
        localStorage.removeItem('securely_verified');
        localStorage.removeItem('securely_remember_email');
        showToast('Logged out successfully', 'info');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
    }

    // ============================================
    // API Functions
    // ============================================
    async function apiRequest(endpoint, method = 'GET', data = null) {
        try {
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
            };
            
            if (data) {
                options.body = JSON.stringify(data);
            }
            
            const response = await fetch(`${window.location.origin}${endpoint}`, options);
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'API request failed');
            }
            
            return result;
        } catch (error) {
            console.error('API Error:', error);
            showToast('Connection error. Please try again.', 'error');
            throw error;
        }
    }

    // ============================================
    // Export functions
    // ============================================
    window.Securely = {
        showToast,
        checkAuthStatus,
        logout,
        apiRequest,
        navigateToRegister: () => window.location.href = 'register.html',
        navigateToLogin: () => window.location.href = 'login.html',
        navigateToDashboard: () => window.location.href = 'dashboard.html',
        navigateToHome: () => window.location.href = 'index.html'
    };
});
