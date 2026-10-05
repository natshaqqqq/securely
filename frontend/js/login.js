// ============================================
// LOGIN PAGE — cookie-based auth
// ============================================

document.addEventListener('DOMContentLoaded', function () {

    const API_BASE = 'http://127.0.0.1:3000';   // ← match dashboard/modules

    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const loginMessage = document.getElementById('loginMessage');

    emailInput.value = '';
    localStorage.removeItem('securely_remember_email');


    // ============================================
    // Toggle Password Visibility
    // ============================================

    const togglePassword = document.getElementById('togglePassword');

    if (togglePassword) {
        togglePassword.addEventListener('click', function () {

            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            }

        });
    }


    // ============================================
    // Login Form
    // ============================================

    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {

            e.preventDefault();

            const email = emailInput.value.trim();
            const password = passwordInput.value;

            clearErrors();

            if (!email) {
                showError('emailError', 'Please enter your email.');
                return;
            }

            if (!isValidEmail(email)) {
                showError('emailError', 'Please enter a valid email.');
                return;
            }

            if (!password) {
                showError('passwordError', 'Please enter your password.');
                return;
            }

            loginBtn.disabled = true;
            loginBtn.textContent = 'Signing in...';

            try {

                const response = await fetch(
                    `${API_BASE}/api/auth/login`,
                    {
                        method: 'POST',
                        credentials: 'include',          // ← KEY: accept + store the cookie
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({ email, password })
                    }
                );

                const result = await response.json();

                if (!response.ok || !result.success) {
                    showMessage(
                        result.message || 'Invalid email or password.',
                        'error'
                    );
                    loginBtn.disabled = false;
                    loginBtn.textContent = 'Sign in';
                    return;
                }


                // ============================================
                // Cookie is now set by the server.
                // We only keep non-sensitive UI data in localStorage.
                // ============================================

                if (result.data) {
                    localStorage.setItem(
                        'securely_user',
                        JSON.stringify(result.data)
                    );
                }


                // ============================================
                // Successful Login
                // ============================================

                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 300);


            } catch (error) {

                console.error('Login error:', error);

                showMessage(
                    'Unable to connect to the server. Please try again.',
                    'error'
                );

                loginBtn.disabled = false;
                loginBtn.textContent = 'Sign in';
            }

        });
    }


    // ============================================
    // Forgot Password
    // ============================================

    const forgotPassword = document.getElementById('forgotPassword');

    if (forgotPassword) {
        forgotPassword.addEventListener('click', function (e) {
            e.preventDefault();
            showMessage(
                'Password reset functionality is not available yet.',
                'info'
            );
        });
    }


    // ============================================
    // Helpers
    // ============================================

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function showError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    function clearErrors() {
        document.querySelectorAll('.error-message').forEach(err => {
            err.style.display = 'none';
        });
    }

    function showMessage(message, type) {
        if (!loginMessage) return;
        loginMessage.textContent = message;
        loginMessage.className = `login-message ${type}`;
    }

});