// module-content.js - Loads module, renders quiz one question at a time

document.addEventListener('DOMContentLoaded', async function () {

    const API_BASE = '';

    let userId = null;
    let userData = null;
    let moduleId = null;
    let moduleData = null;
    let quiz = null;
    let currentIndex = 0;
    let score = 0;
    let answering = false;


    // ============================================
    // Login check
    // ============================================

    async function checkLogin() {
        try {
            const res = await fetch(`${API_BASE}/api/auth/me`, {
                method: 'GET',
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                window.location.href = 'login.html';
                return false;
            }
            userData = data.data;
            userId = userData.id;
            return true;
        } catch (err) {
            console.error(err);
            window.location.href = 'login.html';
            return false;
        }
    }

    if (!(await checkLogin())) return;

    const userNameEl = document.getElementById('userName');
    if (userNameEl && userData?.name) userNameEl.textContent = userData.name;


    // ============================================
    // Get module ID from URL
    // ============================================

    const params = new URLSearchParams(window.location.search);
    moduleId = params.get('id');

    if (!moduleId) {
        window.location.href = 'modules.html';
        return;
    }


    // ============================================
    // Load module + quiz
    // ============================================

    async function loadModule() {
        try {
            const modRes = await fetch(`${API_BASE}/api/modules/${moduleId}`, {
                credentials: 'include'
            });
            const modData = await modRes.json();

            if (!modData.success) throw new Error(modData.message || 'Module not found');
            moduleData = modData.data;

            const quizRes = await fetch(`${API_BASE}/api/modules/${moduleId}/quiz`, {
                credentials: 'include'
            });
            const quizData = await quizRes.json();

            if (!quizData.success) throw new Error(quizData.message || 'Quiz not found');
            quiz = quizData.data;

            if (!quiz.questions || quiz.questions.length === 0) {
                throw new Error('This module has no quiz questions yet.');
            }

            renderModule();
            renderQuestion(0);

        } catch (err) {
            console.error(err);
            document.getElementById('moduleLoading').style.display = 'none';
            document.getElementById('moduleError').style.display = 'block';
            document.getElementById('moduleErrorText').textContent = err.message;
        }
    }


    // ============================================
    // Render module header
    // ============================================

    function renderModule() {
        document.getElementById('moduleHeaderTitle').textContent = 'Modules';

        document.getElementById('moduleIcon').className =
            moduleData.icon_class || 'fas fa-book';

        document.getElementById('moduleTitle').textContent =
            moduleData.title || 'Untitled Module';

        document.getElementById('moduleDescription').textContent =
            moduleData.description || '';

        document.getElementById('moduleLoading').style.display = 'none';
        document.getElementById('moduleBody').style.display = 'block';
    }


    // ============================================
    // Render one question
    // ============================================

    function renderQuestion(index) {
        currentIndex = index;
        answering = false;

        const q = quiz.questions[index];
        if (!q) return finishQuiz();

        const total = quiz.questions.length;

        // Progress
        document.getElementById('quizProgressText').textContent =
            `Question ${index + 1} of ${total}`;

        document.getElementById('quizScoreText').textContent =
            `${score} correct`;

        document.getElementById('quizProgressFill').style.width =
            `${((index) / total) * 100}%`;

        // Question title
        document.getElementById('questionNumber').textContent =
            `${index + 1}. ${q.question}`;

        // Options
        const optionsEl = document.getElementById('quizOptions');
        optionsEl.innerHTML = `
            <button class="quiz-option" data-value="A">${escapeHtml(q.optionA)}</button>
            <button class="quiz-option" data-value="B">${escapeHtml(q.optionB)}</button>
            <button class="quiz-option" data-value="C">${escapeHtml(q.optionC)}</button>
            <button class="quiz-option" data-value="D">${escapeHtml(q.optionD)}</button>
        `;

        // Reset feedback / next
        document.getElementById('feedbackPanel').style.display = 'none';
        document.getElementById('feedbackPanel').innerHTML = '';
        document.getElementById('nextBtn').style.display = 'none';

        // Wire clicks
        optionsEl.querySelectorAll('.quiz-option').forEach(btn => {
            btn.addEventListener('click', () => handleAnswer(btn, q));
        });

        document.getElementById('quizArea').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }


    // ============================================
    // Handle option click
    // ============================================

    async function handleAnswer(btn, q) {
        if (answering) return;
        if (btn.classList.contains('disabled')) return;
        answering = true;

        const allBtns = document.querySelectorAll('.quiz-option');
        allBtns.forEach(b => b.classList.add('disabled'));

        btn.classList.add('selected');

        let data;
        try {
            const res = await fetch(`${API_BASE}/api/modules/${moduleId}/quiz/answer`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questionId: q.id, answer: btn.dataset.value })
            });
            data = await res.json();
        } catch (err) {
            console.error(err);
            answering = false;
            return;
        }

        if (!data.success) {
            answering = false;
            return;
        }

        // Mark the correct option green
        allBtns.forEach(b => {
            if (b.dataset.value === data.data.correctOption) {
                b.classList.add('correct');
            }
        });

        // If the user picked wrong, mark theirs red
        if (!data.data.correct) {
            btn.classList.add('wrong');
        } else {
            score++;
            document.getElementById('quizScoreText').textContent = `${score} correct`;
        }

        // Show feedback
        showFeedback({
            correct: data.data.correct,
            explanation: data.data.correct
                ? data.data.explanationCorrect
                : data.data.explanationWrong,
            keyPoints: data.data.keyPoints
        });

        // Show next button
        const nextBtn = document.getElementById('nextBtn');
        nextBtn.style.display = 'inline-flex';
        nextBtn.innerHTML = (currentIndex + 1 >= quiz.questions.length)
            ? 'Finish Quiz <i class="fas fa-check"></i>'
            : 'Next Question <i class="fas fa-arrow-right"></i>';
    }


    // ============================================
    // Feedback panel
    // ============================================

    function showFeedback({ correct, explanation, keyPoints }) {
        const panel = document.getElementById('feedbackPanel');

        const points = keyPoints
            ? keyPoints.split('\n').map(p => p.replace(/^•\s*/, '').trim()).filter(Boolean)
            : [];

        panel.className = 'feedback-panel ' + (correct ? 'correct' : 'wrong');

        panel.innerHTML = `
            <div class="feedback-header">
                <i class="fas ${correct ? 'fa-check' : 'fa-times'}"></i>
                <span>${correct ? 'Correct Answer' : 'Incorrect Answer'}</span>
            </div>

            <p class="feedback-summary">${escapeHtml(explanation || '')}</p>

            ${points.length ? `
                <div class="feedback-key-points">
                    <div class="feedback-key-title">Tips:</div>
                    <ul>
                        ${points.map(p => `
                            <li>
                                <span class="kp-bullet">•</span>
                                <span>${escapeHtml(p)}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}
        `;

        panel.style.display = 'block';
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }


    // ============================================
    // Next button
    // ============================================

    document.getElementById('nextBtn').addEventListener('click', () => {
        if (currentIndex + 1 >= quiz.questions.length) {
            finishQuiz();
        } else {
            renderQuestion(currentIndex + 1);
        }
    });


    // ============================================
    // Finish quiz
    // ============================================

    async function finishQuiz() {
        document.getElementById('quizProgressFill').style.width = '100%';

        let result;
        try {
            const res = await fetch(`${API_BASE}/api/modules/${moduleId}/quiz/finish`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    score,
                    total: quiz.questions.length
                })
            });
            result = await res.json();
        } catch (err) {
            console.error(err);
            return;
        }

        if (!result.success) {
            alert('Could not submit quiz.');
            return;
        }

        const r = result.data;

        const pointsLine = r.passed
            ? `+${r.pointsEarned} points awarded.`
            : `You need ${r.passingScore}% to pass. Retake to earn points.`;

        const deductedLine = r.pointsDeducted > 0
            ? `<p class="finish-note">Previous attempt: ${r.pointsDeducted} points removed. Net change: ${r.netPoints > 0 ? '+' : ''}${r.netPoints}.</p>`
            : '';

        document.getElementById('quizArea').innerHTML = `
            <div class="finish-screen">
                <div class="finish-icon ${r.passed ? 'passed' : 'failed'}">
                    <i class="fas ${r.passed ? 'fa-trophy' : 'fa-times-circle'}"></i>
                </div>

                <h2>${r.passed ? 'Module Complete!' : 'Try Again'}</h2>

                <p class="finish-score">
                    You scored <strong>${r.score} / ${r.total}</strong> (${r.percentage}%)
                </p>

                <p class="finish-message">${pointsLine}</p>
                ${deductedLine}

                <div class="finish-actions">
                    <a href="modules.html" class="lesson-btn">
                        <i class="fas fa-arrow-left"></i> Back to Modules
                    </a>
                    <button onclick="window.location.reload()" class="lesson-btn">
                        <i class="fas fa-rotate-left"></i> Retake Quiz
                    </button>
                </div>
            </div>
        `;
    }


    // ============================================
    // Utilities
    // ============================================

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }


    // ============================================
    // Mobile sidebar + nav
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
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });
        } catch (err) { console.error(err); }
        window.location.href = 'index.html';
    });


    // ============================================
    // Go
    // ============================================

    await loadModule();
});
