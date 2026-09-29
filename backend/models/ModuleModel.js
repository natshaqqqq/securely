// ModuleModel.js - Handles module and quiz database operations

const { promisePool } = require('../config/database');

class ModuleModel {

    // ============================================
    // Modules
    // ============================================

    static async getAllModules() {
        try {
            const [rows] = await promisePool.query(
                `SELECT id, name AS title, description,
                        icon_class, points_reward
                 FROM modules
                 WHERE is_active = TRUE
                 ORDER BY id`
            );
            return rows;
        } catch (error) {
            throw new Error('Failed to get modules: ' + error.message);
        }
    }

    static async getModuleById(moduleId) {
        const [rows] = await promisePool.query(
            `SELECT id, name AS title, description, summary,
                icon_class, points_reward
            FROM modules
            WHERE id = ? AND is_active = TRUE`,
            [moduleId]
        );
        return rows[0] || null;
    }

    static async getUserModuleProgress(userId) {
        const [rows] = await promisePool.query(
            `SELECT m.id,
                    m.name AS title,
                    m.description,
                    m.summary,
                    m.icon_class,
                    m.points_reward,
                    COALESCE(up.completed, 0) AS completed,
                    up.score,
                    up.completed_at
            FROM modules m
            LEFT JOIN user_progress up
                    ON m.id = up.module_id AND up.user_id = ?
            WHERE m.is_active = TRUE
            ORDER BY m.id`,
            [userId]
        );
        return rows;
    }

    // ============================================
    // Module completion
    // ============================================

    static async markAsCompleted(userId, moduleId, score = 100) {
        try {
            await promisePool.query(
                `INSERT INTO user_progress
                    (user_id, module_id, completed, score, completed_at)
                 VALUES (?, ?, TRUE, ?, NOW())
                 ON DUPLICATE KEY UPDATE
                    completed    = TRUE,
                    score        = VALUES(score),
                    completed_at = NOW()`,
                [userId, moduleId, score]
            );

            const [rows] = await promisePool.query(
                'SELECT points_reward FROM modules WHERE id = ?',
                [moduleId]
            );

            return rows[0]?.points_reward || 0;

        } catch (error) {
            throw new Error('Failed to complete module: ' + error.message);
        }
    }

    // ============================================
    // Quiz
    // ============================================

    static async getQuizWithQuestions(moduleId) {
        const [quizRows] = await promisePool.query(
            `SELECT id, module_id, title, passing_score
             FROM quizzes
             WHERE module_id = ?
             LIMIT 1`,
            [moduleId]
        );

        if (!quizRows[0]) return null;

        const quiz = quizRows[0];

        const [questions] = await promisePool.query(
            `SELECT id, question,
                    option_a AS optionA,
                    option_b AS optionB,
                    option_c AS optionC,
                    option_d AS optionD,
                    position
             FROM quiz_questions
             WHERE quiz_id = ?
             ORDER BY position, id`,
            [quiz.id]
        );

        quiz.questions = questions;
        return quiz;
    }

    static async checkAnswer(questionId, chosenOption) {
        const [rows] = await promisePool.query(
            `SELECT id, correct_option, explanation_correct,
                    explanation_wrong, key_points
             FROM quiz_questions
             WHERE id = ?`,
            [questionId]
        );

        if (!rows[0]) return null;

        const q = rows[0];
        const correct = q.correct_option === chosenOption.toUpperCase();

        return {
            correct,
            correctOption: q.correct_option,
            explanationCorrect: q.explanation_correct,
            explanationWrong: q.explanation_wrong,
            keyPoints: q.key_points
        };
    }

    // ============================================
    // Reset and attempts
    // ============================================

    static async resetModuleProgress(userId, moduleId) {
        const [existing] = await promisePool.query(
            `SELECT m.points_reward
             FROM user_progress up
             JOIN modules m ON m.id = up.module_id
             WHERE up.user_id = ? AND up.module_id = ?`,
            [userId, moduleId]
        );

        const pointsDeducted = existing[0]?.points_reward || 0;

        await promisePool.query(
            'DELETE FROM user_progress WHERE user_id = ? AND module_id = ?',
            [userId, moduleId]
        );

        await promisePool.query(
            `DELETE qa FROM quiz_attempts qa
             JOIN quizzes q ON q.id = qa.quiz_id
             WHERE qa.user_id = ? AND q.module_id = ?`,
            [userId, moduleId]
        );

        return pointsDeducted;
    }

    static async recordAttempt(userId, quizId, score, total, percentage, passed) {
        await promisePool.query(
            `INSERT INTO quiz_attempts
                (user_id, quiz_id, score, total, percentage, passed)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, quizId, score, total, percentage, passed ? 1 : 0]
        );
    }

    static async getLatestAttempt(userId, moduleId) {
        const [rows] = await promisePool.query(
            `SELECT qa.score, qa.total, qa.percentage, qa.passed, qa.attempted_at
             FROM quiz_attempts qa
             JOIN quizzes q ON q.id = qa.quiz_id
             WHERE qa.user_id = ? AND q.module_id = ?
             ORDER BY qa.attempted_at DESC
             LIMIT 1`,
            [userId, moduleId]
        );
        return rows[0] || null;
    }
}

module.exports = ModuleModel;