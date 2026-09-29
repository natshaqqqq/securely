// verify.js - Email verification page

document.addEventListener('DOMContentLoaded', function () {

    const codeInputs = document.querySelectorAll('.code-input');
    const verifyForm = document.getElementById('verifyForm');
    const verifyBtn = document.getElementById('verifyBtn');
    const resendLink = document.getElementById('resendLink');
    const timerSpan = document.getElementById('timer');
    const errorDiv = document.getElementById('verifyError');

    const API_BASE_URL = 'http://localhost:3000';

    // Resend timer
    let resendTimer = 30;
    let timerInterval = null;

    // Prevent double-click / multiple resend requests
    let isResending = false;


    // ============================================
    // Get Email
    // ============================================

    const urlParams = new URLSearchParams(window.location.search);
    let email = urlParams.get('email');

    // If email is not in URL, get it from localStorage
    if (!email) {
        email = localStorage.getItem('securely_user_email');
    }

    if (email) {

        const userEmail = document.getElementById('userEmail');

        if (userEmail) {
            userEmail.textContent = email;
        }

        // Keep email for use on this page
        localStorage.setItem('securely_user_email', email);

    } else {

        // No email found
        errorDiv.textContent =
            'Email address is missing. Please register again.';

        errorDiv.classList.add('show');

        setTimeout(() => {
            window.location.href = 'register.html';
        }, 2000);

        return;
    }


    // ============================================
    // Reset Resend Timer
    // ============================================

    function resetTimer() {

        resendTimer = 30;

        clearInterval(timerInterval);

        if (resendLink) {

            resendLink.classList.add('disabled');
            resendLink.style.pointerEvents = 'none';

            resendLink.innerHTML =
                'Resend in <span class="timer" id="timer">30</span>s';
        }

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


    // ============================================
    // Start Initial 30-Second Timer
    // ============================================

    // initial code already sent after click verify button
    // start the timer immediately when the page loads

    resetTimer();


    // ============================================
    // Resend Verification Code
    // ============================================

    async function resendCode() {

        // Prevent multiple resend requests
        if (isResending) {
            return;
        }

        if (!email) {

            errorDiv.style.color = '#ef4444';

            errorDiv.textContent =
                'Email address is missing.';

            errorDiv.classList.add('show');

            return;
        }

        // Lock resend immediately
        isResending = true;


        // ============================================
        // START TIMER IMMEDIATELY
        // ============================================

        // The 30-second cooldown starts as soon
        // as the user clicks "Resend code".

        resetTimer();


        try {

            console.log(
                'Resending verification code to:',
                email
            );

            const response = await fetch(
                `${API_BASE_URL}/api/auth/resend-verification`,
                {
                    method: 'POST',

                    // Allow cookies to be sent with the request
                    credentials: 'include',

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
                    'Failed to resend verification code.'
                );
            }


            console.log(
                'New verification code sent:',
                result
            );


            // ============================================
            // Show Success Message
            // ============================================

            errorDiv.style.color = '#3e413f';

            errorDiv.textContent =
                'New verification code sent to your email!';

            errorDiv.classList.add('show');


            // Hide message after 3 seconds
            setTimeout(() => {

                errorDiv.style.color = '#ef4444';
                errorDiv.classList.remove('show');

            }, 3000);


        } catch (error) {

            console.error(
                'Resend verification error:',
                error
            );


            // ============================================
            // Cancel Timer If Resend Failed
            // ============================================

            clearInterval(timerInterval);

            errorDiv.style.color = '#ef4444';

            errorDiv.textContent =
                error.message ||
                'Failed to resend verification code. Please try again.';

            errorDiv.classList.add('show');


            // Allow resend again if request failed
            isResending = false;


            if (resendLink) {

                resendLink.classList.remove('disabled');
                resendLink.style.pointerEvents = 'auto';
                resendLink.innerHTML = 'Resend code';

            }

            return;
        }


        // Unlock after successful request
        isResending = false;
    }


    // ============================================
    // Code Input Handling
    // ============================================

    codeInputs.forEach(function (input, index) {


        // ============================================
        // Input
        // ============================================

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
            if (
                this.value.length === 1 &&
                index < codeInputs.length - 1
            ) {

                codeInputs[index + 1].focus();
            }

            // Hide error
            errorDiv.classList.remove('show');

        });


        // ============================================
        // Backspace
        // ============================================

        input.addEventListener('keydown', function (e) {

            if (
                e.key === 'Backspace' &&
                this.value === '' &&
                index > 0
            ) {

                codeInputs[index - 1].focus();
            }

        });


        // ============================================
        // Paste Support
        // ============================================

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


    // ============================================
    // Get Entered Verification Code
    // ============================================

    function getEnteredCode() {

        let code = '';

        codeInputs.forEach(function (input) {

            code += input.value;

        });

        return code;
    }


    // ============================================
    // Verify Code
    // ============================================

    if (verifyForm) {

        verifyForm.addEventListener(
            'submit',
            async function (e) {

                e.preventDefault();

                const enteredCode = getEnteredCode();


                // ============================================
                // Check Code Length
                // ============================================

                if (enteredCode.length !== 4) {

                    errorDiv.style.color = '#ef4444';

                    errorDiv.textContent =
                        'Please enter all 4 digits.';

                    errorDiv.classList.add('show');

                    return;
                }


                // ============================================
                // Check Email
                // ============================================

                if (!email) {

                    errorDiv.style.color = '#ef4444';

                    errorDiv.textContent =
                        'Email address is missing.';

                    errorDiv.classList.add('show');

                    return;
                }


                // ============================================
                // Disable Button
                // ============================================

                verifyBtn.disabled = true;
                verifyBtn.textContent = 'Verifying...';


                try {

                    const response = await fetch(
                        `${API_BASE_URL}/api/auth/verify-code`,
                        {
                            method: 'POST',

                            // Allow the server to set/send the cookie
                            credentials: 'include',

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


                    // ============================================
                    // Verification Successful
                    // ============================================

                    errorDiv.style.color = '#22c55e';

                    errorDiv.textContent =
                        'Verification successful!';

                    errorDiv.classList.add('show');


                    // ============================================
                    // Save User Information
                    // ============================================

                    if (result.data) {

                        if (result.data.name) {

                            localStorage.setItem(
                                'securely_user_name',
                                result.data.name
                            );
                        }

                        if (result.data.email) {

                            localStorage.setItem(
                                'securely_user_email',
                                result.data.email
                            );
                        }
                    }


                    // ============================================
                    // Redirect
                    // ============================================

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


                    // Enable button again
                    verifyBtn.disabled = false;

                    verifyBtn.textContent =
                        'Verify & Continue';

                    verifyBtn.classList.remove('success');


                    // Clear inputs
                    codeInputs.forEach(function (input) {

                        input.value = '';

                    });


                    // Focus first input
                    if (codeInputs.length > 0) {

                        codeInputs[0].focus();

                    }

                }

            }
        );

    }


    // ============================================
    // Resend Verification Code
    // ============================================

    if (resendLink) {

        resendLink.addEventListener(
            'click',
            function (e) {

                e.preventDefault();


                // Don't allow resend while timer is running
                if (
                    this.classList.contains('disabled')
                ) {

                    return;
                }


                // Don't allow double click
                if (isResending) {
                    return;
                }

                resendCode();

            }
        );

    }

});