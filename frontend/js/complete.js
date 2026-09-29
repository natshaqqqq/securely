// complete.js - Registration complete page

document.addEventListener('DOMContentLoaded', function() {
    
    // ============================================
    // Check if user is logged in
    // ============================================
    const userId = localStorage.getItem('securely_user_id');
    if (!userId) {
        // If not logged in, redirect to login
        window.location.href = 'complete.html';
        return;
    }

    // ============================================
    // Get user data for display (optional)
    // ============================================
    const userData = JSON.parse(localStorage.getItem('securely_user') || '{}');
    const userEmail = localStorage.getItem('securely_user_email');
    
    console.log('✅ Registration complete for:', userEmail || userData.email);
    console.log('👤 User:', userData.name || 'User');

    // ============================================
    // Start Training Button - Redirect to Dashboard
    // ============================================
    const startBtn = document.getElementById('startTrainingBtn');
    if (startBtn) {
        startBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Show loading state
            const originalText = this.textContent;
            this.textContent = 'Loading...';
            this.disabled = true;
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'frontend/dashboard.html';
            }, 500);
        });
    }

    // ============================================
    // Auto-redirect after 5 seconds (optional)
    // ============================================
    // Uncomment this if you want auto-redirect
    /*
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 5000);
    */

    // ============================================
    // Keyboard shortcut: Enter key to start
    // ============================================
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            if (startBtn && !startBtn.disabled) {
                startBtn.click();
            }
        }
    });
});