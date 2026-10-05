// auth.js - Registration page functionality with correct flow (user saved only after verification)

document.addEventListener('DOMContentLoaded', function() {
    console.log('Auth.js loaded successfully');
    
    const form = document.getElementById('registerForm');
    const fullName = document.getElementById('name');
    const email = document.getElementById('email');
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');
    const togglePassword = document.getElementById('togglePassword');
    const toggleConfirm = document.getElementById('toggleConfirmPassword');

    // API Base URL
    const API_BASE_URL = 'https://securely-backend-xq4c.onrender.com';

    // Check if user is already logged in
    const userId = localStorage.getItem('securely_user_id');
    if (userId) {
        window.location.href = 'dashboard.html';
        return;
    }

    // Toggle password visibility
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
            password.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }

    if (toggleConfirm) {
        toggleConfirm.addEventListener('click', function() {
            const type = confirmPassword.getAttribute('type') === 'password' ? 'text' : 'password';
            confirmPassword.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }

    // Form submission
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            let isValid = true;

            // Clear previous messages
            const messageDiv = document.getElementById('registerMessage');
            if (messageDiv) {
                messageDiv.textContent = '';
                messageDiv.classList.remove('show');
                messageDiv.style.color = '#ef4444';
            }

            // Validate name
            const nameError = document.getElementById('nameError');
            if (fullName.value.trim().length < 2) {
                nameError.classList.add('show');
                isValid = false;
            } else {
                nameError.classList.remove('show');
            }

            // Validate email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const emailError = document.getElementById('emailError');
            if (!emailRegex.test(email.value)) {
                emailError.classList.add('show');
                isValid = false;
            } else {
                emailError.classList.remove('show');
            }

            // Validate password
            const passwordError = document.getElementById('passwordError');
            if (password.value.length < 8) {
                passwordError.classList.add('show');
                isValid = false;
            } else {
                passwordError.classList.remove('show');
            }

            // Validate confirm password
            const confirmError = document.getElementById('confirmPasswordError');
            if (password.value !== confirmPassword.value) {
                confirmError.classList.add('show');
                isValid = false;
            } else {
                confirmError.classList.remove('show');
            }

            if (!isValid) return;

            // Show loading state
            const btn = form.querySelector('.auth-btn');
            const originalText = btn.textContent;
            btn.textContent = 'Sending verification...';
            btn.disabled = true;

            // Prepare user data (will be stored after verification)
            const userData = {
                name: fullName.value.trim(),
                email: email.value.trim().toLowerCase(),
                password: password.value
            };

            console.log('📝 Sending verification for:', userData.email);

            // STEP 1: Send verification code (user is NOT saved yet)
            fetch(`${API_BASE_URL}/api/auth/send-verification`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(userData)
            })
            .then(async response => {
                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.message || 'Failed to send verification code.');
                }
                return result;
            })
            .then(() => {
                // Store email for verification page
                localStorage.setItem('securely_user_email', userData.email);
                localStorage.setItem('securely_user_name', userData.name);
                
                btn.textContent = 'Code sent! Redirecting...';
                
                // Redirect to verify page after delay
                setTimeout(() => {
                    window.location.href = 'verify.html?email=' + encodeURIComponent(userData.email);
                }, 1500);
            })
            .catch(error => {
                console.error('Verification error:', error);
                if (messageDiv) {
                    messageDiv.textContent = error.message || 'Failed to send verification code. Please try again.';
                    messageDiv.style.color = '#ef4444';
                    messageDiv.classList.add('show');
                }
                btn.textContent = originalText;
                btn.disabled = false;
            });
        });
    }

    // Real-time validation on blur
    if (fullName) {
        fullName.addEventListener('blur', function() {
            const nameError = document.getElementById('nameError');
            if (this.value.trim().length < 2) {
                nameError.classList.add('show');
            } else {
                nameError.classList.remove('show');
            }
        });
    }

    if (email) {
        email.addEventListener('blur', function() {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const emailError = document.getElementById('emailError');
            if (!emailRegex.test(this.value)) {
                emailError.classList.add('show');
            } else {
                emailError.classList.remove('show');
            }
        });
    }

    if (password) {
        password.addEventListener('blur', function() {
            const passwordError = document.getElementById('passwordError');
            if (this.value.length < 8) {
                passwordError.classList.add('show');
            } else {
                passwordError.classList.remove('show');
            }
        });
    }

    if (confirmPassword) {
        confirmPassword.addEventListener('blur', function() {
            const confirmError = document.getElementById('confirmPasswordError');
            if (this.value !== password.value) {
                confirmError.classList.add('show');
            } else {
                confirmError.classList.remove('show');
            }
        });
    }
});