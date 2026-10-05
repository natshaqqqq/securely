// verify.js - Email verification page

document.addEventListener('DOMContentLoaded', function () {
    [
        ['togglePassword', 'password'],
        ['toggleConfirmPassword', 'confirmPassword']
    ].forEach(function ([toggleId, inputId]) {
        const toggle = document.getElementById(toggleId);
        const input = document.getElementById(inputId);

        if (toggle && input) {
            toggle.addEventListener('click', function () {
                const showPassword = input.type === 'password';
                input.type = showPassword ? 'text' : 'password';
                toggle.classList.toggle('fa-eye', !showPassword);
                toggle.classList.toggle('fa-eye-slash', showPassword);
            });
        }
    });

    const codeInputs = document.querySelectorAll('.code-input');
    const verifyForm = document.getElementById('verifyForm');
    const verifyBtn = document.getElementById('verifyBtn');
    const resendLink = document.getElementById('resendLink');
    const timerSpan = document.getElementById('timer');
    const errorDiv = document.getElementById('verifyError');

    const API_BASE_URL = 'http://localhost:3000';

    let resendTimer = 60;
    let timerInterval = null;

    // Get email from URL
    const urlParams = new URLSearchParams(window.location.search);
    let email = urlParams.get('email');
    
    // If not in URL, try localStorage
    if (!email) {
        email = localStorage.getItem('securely_user_email');
    }

    if (email) {
        const userEmail = document.getElementById('userEmail');
        if (userEmail) {
            userEmail.textContent = email;
        }
        // Store email for later use
        localStorage.setItem('securely_user_email', email);
    } else {
        // No email found, redirect back to register
        errorDiv.textContent = 'Email address is missing. Please register again.';
        errorDiv.classList.add('show');
        setTimeout(() => {
            window.location.href = 'register.html';
        }, 2000);
        return;
    }

    // Reset timer
    function resetTimer() {
        resendTimer = 60;

        if (timerSpan) {
            timerSpan.textContent = resendTimer;
        }

        if (resendLink) {
            resendLink.classList.add('disabled');
            resendLink.style.pointerEvents = 'none';
            resendLink.innerHTML =
                'Resend in <span class="timer" id="timer">60</span>s';
        }

        clearInterval(timerInterval);

        timerInterval = setInterval(function () {
            resendTimer--;

            if (resendTimer <= 0) {
                clearInterval(timerInterval);

                if (resendLink) {
                    resendLink.innerHTML = 'Resend code';
                    resendLink.style.pointerEvents = 'auto';
                    resendLink.classList.remove('disabled');
                }

                return;
            }

            if (resendLink) {
                resendLink.innerHTML =
                    'Resend in <span class="timer" id="timer">' +
                    resendTimer +
                    '</span>s';
            }
        }, 1000);
    }

    // Send verification code through backend
    async function sendCode() {
        if (!email) {
            errorDiv.textContent = 'Email address is missing.';
            errorDiv.classList.add('show');
            return;
        }

        try {
            console.log('Sending verification code to:', email);
            
            const response = await fetch(
                `${API_BASE_URL}/api/auth/send-verification`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        email: email.toLowerCase()
                    })
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message ||
                    'Failed to send verification code.'
                );
            }

            console.log('Verification code sent successfully:', result);
            
            // Show success message
            errorDiv.style.color = '#22c55e';
            errorDiv.textContent = 'Verification code sent to your email!';
            errorDiv.classList.add('show');
            
            // Reset color after 3 seconds
            setTimeout(() => {
                errorDiv.style.color = '#ef4444';
                errorDiv.classList.remove('show');
            }, 3000);

            resetTimer();

        } catch (error) {
            console.error('Send verification error:', error);

            errorDiv.style.color = '#ef4444';
            errorDiv.textContent =
                error.message ||
                'Failed to send verification code. Please try again.';

            errorDiv.classList.add('show');
        }
    }

    // Initial code send - wait a moment before sending
    setTimeout(() => {
        sendCode();
    }, 500);

    // Auto-focus and move between inputs
    codeInputs.forEach(function (input, index) {

        input.addEventListener('input', function () {
            const value = this.value;

            // Only allow numbers
            if (!/^\d*$/.test(value)) {
                this.value = '';
                return;
            }

            // Only keep one digit
            if (value.length > 1) {
                this.value = value.slice(-1);
            }

            // Move to next input
            if (this.value.length === 1 && index < codeInputs.length - 1) {
                codeInputs[index + 1].focus();
            }

            errorDiv.classList.remove('show');
        });

        // Move back on backspace
        input.addEventListener('keydown', function (e) {
            if (
                e.key === 'Backspace' &&
                this.value === '' &&
                index > 0
            ) {
                codeInputs[index - 1].focus();
            }
        });

        // Paste support
        input.addEventListener('paste', function (e) {
            e.preventDefault();

            const paste =
                (e.clipboardData || window.clipboardData)
                    .getData('text');

            const digits = paste
                .replace(/\D/g, '')
                .slice(0, codeInputs.length);

            for (
                let i = 0;
                i < digits.length;
                i++
            ) {
                codeInputs[i].value = digits[i];
            }

            if (digits.length > 0) {
                const nextIndex = Math.min(
                    digits.length,
                    codeInputs.length - 1
                );

                codeInputs[nextIndex].focus();
            }
        });
    });

    // Get entered code
    function getEnteredCode() {
        let code = '';

        codeInputs.forEach(function (input) {
            code += input.value;
        });

        return code;
    }

    // Verify code
    if (verifyForm) {
        verifyForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const enteredCode = getEnteredCode();

            if (enteredCode.length !== 4) {
                errorDiv.textContent =
                    'Please enter all 4 digits.';

                errorDiv.classList.add('show');
                return;
            }

            if (!email) {
                errorDiv.textContent =
                    'Email address is missing.';

                errorDiv.classList.add('show');
                return;
            }

            verifyBtn.disabled = true;
            verifyBtn.textContent = 'Verifying...';

            try {
                const response = await fetch(
                    `${API_BASE_URL}/api/auth/verify`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({
                            email: email.toLowerCase(),
                            code: enteredCode
                        })
                    }
                );

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.message ||
                        'Invalid verification code.'
                    );
                }

                // Verification successful
                errorDiv.style.color = '#22c55e';
                errorDiv.textContent = '✅ Verification successful!';
                errorDiv.classList.add('show');

                localStorage.setItem(
                    'securely_verified',
                    'true'
                );

                if (result.userId) {
                    localStorage.setItem(
                        'securely_user_id',
                        result.userId
                    );
                }

                verifyBtn.textContent =
                    'Success! Redirecting...';

                verifyBtn.classList.add('success');

                setTimeout(function () {
                    
                    window.location.href = 'complete.html';
                }, 800);

            } catch (error) {
                console.error(
                    'Verification error:',
                    error
                );

                errorDiv.style.color = '#ef4444';
                errorDiv.textContent =
                    error.message ||
                    'Invalid verification code. Please try again.';

                errorDiv.classList.add('show');

                verifyBtn.disabled = false;
                verifyBtn.textContent =
                    'Verify & Continue';

                verifyBtn.classList.remove('success');

                // Clear inputs
                codeInputs.forEach(function (input) {
                    input.value = '';
                });

                if (codeInputs.length > 0) {
                    codeInputs[0].focus();
                }
            }
        });
    }

    // Resend verification code
    if (resendLink) {
        resendLink.addEventListener('click', function (e) {
            e.preventDefault();

            if (this.classList.contains('disabled')) {
                return;
            }

            sendCode();
        });
    }
});