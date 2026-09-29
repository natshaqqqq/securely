// ============================================
// LOGIN PAGE
// ============================================

document.addEventListener('DOMContentLoaded', function () {

    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const rememberMe = document.getElementById('rememberMe');
    const loginBtn = document.getElementById('loginBtn');
    const loginMessage = document.getElementById('loginMessage');

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
    // Remember Email
    // ============================================

    const savedEmail = localStorage.getItem('securely_remember_email');

    if (savedEmail) {
        emailInput.value = savedEmail;
        rememberMe.checked = true;
    }


    // ============================================
    // Login Form
    // ============================================

    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {

            e.preventDefault();

            const email = emailInput.value.trim();
            const password = passwordInput.value;

            // Clear previous errors
            clearErrors();

            // Validate email
            if (!email) {
                showError('emailError', 'Please enter your email.');
                return;
            }

            if (!isValidEmail(email)) {
                showError('emailError', 'Please enter a valid email.');
                return;
            }

            // Validate password
            if (!password) {
                showError('passwordError', 'Please enter your password.');
                return;
            }

            // Disable button while logging in
            loginBtn.disabled = true;
            loginBtn.textContent = 'Signing in...';

            try {

                const response = await fetch(
                    'http://127.0.0.1:3000/api/auth/login',
                    {
                        method: 'POST',

                        // Allow the browser to receive/send cookies
                        credentials: 'include',

                        headers: {
                            'Content-Type': 'application/json'
                        },

                        body: JSON.stringify({
                            email: email,
                            password: password
                        })
                    }
                );

                const result = await response.json();

                if (!response.ok) {

                    showMessage(
                        result.message || 'Invalid email or password.',
                        'error'
                    );

                    loginBtn.disabled = false;
                    loginBtn.textContent = 'Sign in';

                    return;
                }


                // ============================================
                // Remember Email
                // ============================================

                if (rememberMe.checked) {

                    localStorage.setItem(
                        'securely_remember_email',
                        email
                    );

                } else {

                    localStorage.removeItem(
                        'securely_remember_email'
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
    // Helper Functions
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

        const errors = document.querySelectorAll('.error-message');

        errors.forEach(error => {

            error.style.display = 'none';

        });

    }


    function showMessage(message, type) {

        if (!loginMessage) {
            return;
        }

        loginMessage.textContent = message;
        loginMessage.className = `login-message ${type}`;

    }

});