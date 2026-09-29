// controllers/moduleController.js
const ModuleModel = require('../models/ModuleModel');

class ModuleController {

    // ============================================
    // GET /api/modules?userId=123
    // ============================================
    static async getAllModules(req, res) {
        try {
            const userId = req.query.userId;

            let modules;

            if (userId) {
                modules = await ModuleModel.getUserModuleProgress(userId);
            } else {
                modules = await ModuleModel.getAllModules();
            }

            res.json({ success: true, data: modules });

        } catch (error) {
            console.error('🔴 getAllModules FAILED:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // ============================================
    // GET /api/modules/:id
    // ============================================
    static async getModuleById(req, res) {
        try {
            const module = await ModuleModel.getModuleById(req.params.id);

            if (!module) {
                return res.status(404).json({
                    success: false,
                    message: 'Module not found'
                });
            }

            res.json({ success: true, data: module });

        } catch (error) {
            console.error('🔴 getModuleById FAILED:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // ============================================
    // POST /api/modules/complete
    // ============================================
    static async completeModule(req, res) {
        try {
            const { userId, moduleId, score } = req.body;

            if (!userId || !moduleId) {
                return res.status(400).json({
                    success: false,
                    message: 'userId and moduleId are required'
                });
            }

            const module = await ModuleModel.getModuleById(moduleId);

            if (!module) {
                return res.status(404).json({
                    success: false,
                    message: 'Module not found'
                });
            }

            const pointsEarned = await ModuleModel.markAsCompleted(
                userId,
                moduleId,
                score || 100
            );

            res.json({
                success: true,
                message: 'Module completed',
                data: {
                    moduleId: module.id,
                    pointsEarned
                }
            });

        } catch (error) {
            console.error('🔴 completeModule FAILED:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // ============================================
    // GET /api/modules/:id/quiz
    // ============================================
    static async getModuleQuiz(req, res) {
        try {
            const quiz = await ModuleModel.getQuizWithQuestions(req.params.id);

            if (!quiz) {
                return res.status(404).json({
                    success: false,
                    message: 'No quiz found for this module'
                });
            }

            res.json({ success: true, data: quiz });

        } catch (error) {
            console.error('🔴 getModuleQuiz FAILED:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // ============================================
    // POST /api/modules/:id/quiz/answer
    // ============================================
    static async answerQuestion(req, res) {
        try {
            const { questionId, answer } = req.body;

            if (!questionId || !answer) {
                return res.status(400).json({
                    success: false,
                    message: 'questionId and answer are required'
                });
            }

            const result = await ModuleModel.checkAnswer(questionId, answer);

            if (!result) {
                return res.status(404).json({
                    success: false,
                    message: 'Question not found'
                });
            }

            res.json({ success: true, data: result });

        } catch (error) {
            console.error('🔴 answerQuestion FAILED:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // ============================================
    // POST /api/modules/:id/quiz/finish
    // ============================================
    static async finishQuiz(req, res) {
        try {
            const moduleId = req.params.id;
            const { userId, score, total } = req.body;

            if (!userId || score === undefined || !total) {
                return res.status(400).json({
                    success: false,
                    message: 'userId, score, and total are required'
                });
            }

            const quiz = await ModuleModel.getQuizWithQuestions(moduleId);

            if (!quiz) {
                return res.status(404).json({
                    success: false,
                    message: 'Quiz not found'
                });
            }

            const percentage = Math.round((score / total) * 100);
            const passed = percentage >= quiz.passing_score;

            // Reset old progress (deducts any points previously earned)
            const pointsDeducted = await ModuleModel.resetModuleProgress(userId, moduleId);

            // Record this attempt
            await ModuleModel.recordAttempt(
                userId, quiz.id, score, total, percentage, passed
            );

            // If passed, award fresh points
            let pointsEarned = 0;
            if (passed) {
                pointsEarned = await ModuleModel.markAsCompleted(
                    userId, moduleId, percentage
                );
            }

            res.json({
                success: true,
                data: {
                    score,
                    total,
                    percentage,
                    passed,
                    passingScore: quiz.passing_score,
                    pointsDeducted,
                    pointsEarned,
                    netPoints: pointsEarned - pointsDeducted
                }
            });

        } catch (error) {
            console.error('🔴 finishQuiz FAILED:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // ============================================
    // DELETE /api/modules/:id/progress
    // ============================================
    static async resetModuleProgress(req, res) {
        try {
            const moduleId = req.params.id;
            const userId = req.body.userId || req.query.userId;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: 'userId is required'
                });
            }

            const pointsDeducted = await ModuleModel.resetModuleProgress(userId, moduleId);

            res.json({
                success: true,
                message: 'Progress reset',
                data: { pointsDeducted }
            });

        } catch (error) {
            console.error('🔴 resetModuleProgress FAILED:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = ModuleController;