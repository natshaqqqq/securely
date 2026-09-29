// Training controller - handles training session operations

const UserModel = require('../models/UserModel');
const { promisePool } = require('../config/database');

class TrainingController {
    // Start training session
    static async startTraining(req, res) {
        try {
            const { username, email } = req.body;
            
            // Get or create user
            const user = await UserModel.getOrCreateUser(username, email);
            
            // Create new training session
            const [result] = await promisePool.query(
                'INSERT INTO training_sessions (user_id, status) VALUES (?, ?)',
                [user.id, 'active']
            );
            
            res.json({
                success: true,
                message: 'Training session started',
                data: {
                    sessionId: result.insertId,
                    userId: user.id,
                    username: user.username,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // Resume training
    static async resumeTraining(req, res) {
        try {
            const { userId } = req.body;
            
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID is required'
                });
            }
            
            const user = await UserModel.getUserById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            const progress = await UserModel.getUserProgress(userId);
            
            res.json({
                success: true,
                message: 'Training session resumed',
                data: {
                    user,
                    progress
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // Get user progress
    static async getProgress(req, res) {
        try {
            const { userId } = req.query;
            
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID is required'
                });
            }
            
            const user = await UserModel.getUserById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            const progress = await UserModel.getUserProgress(userId);
            
            res.json({
                success: true,
                data: {
                    user,
                    progress
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // Reset progress
    static async resetProgress(req, res) {
        try {
            const { userId } = req.body;
            
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID is required'
                });
            }
            
            // Delete user progress
            await promisePool.query(
                'DELETE FROM user_progress WHERE user_id = ?',
                [userId]
            );
            
            await promisePool.query(
                'DELETE FROM user_badges WHERE user_id = ?',
                [userId]
            );
            
            await promisePool.query(
                'DELETE FROM training_sessions WHERE user_id = ?',
                [userId]
            );
            
            res.json({
                success: true,
                message: 'Progress reset successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = TrainingController;