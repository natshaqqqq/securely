// User model - handles all user-related database operations

const { promisePool } = require('../config/database');

class UserModel {

    // Create new user
    static async createUser(name, email, password) {
        try {
            const [result] = await promisePool.query(
                'INSERT INTO users (name, email, password, is_verified) VALUES (?, ?, ?, FALSE)',
                [name, email, password]
            );

            return result.insertId;
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Email already exists');
            }
            throw new Error('Failed to create user: ' + error.message);
        }
    }

    // Get user by email
    static async getUserByEmail(email) {
        try {
            const [rows] = await promisePool.query(
                'SELECT * FROM users WHERE email = ?',
                [email]
            );

            return rows[0] || null;
        } catch (error) {
            throw new Error('Failed to get user: ' + error.message);
        }
    }

    // Get user by name
    static async getUserByName(name) {
        try {
            const [rows] = await promisePool.query(
                'SELECT * FROM users WHERE name = ?',
                [name]
            );

            return rows[0] || null;
        } catch (error) {
            throw new Error('Failed to get user: ' + error.message);
        }
    }

    // Get user by ID
    static async getUserById(userId) {
        try {
            const [rows] = await promisePool.query(
                `SELECT id, name, email, is_verified, created_at
                 FROM users
                 WHERE id = ?`,
                [userId]
            );

            return rows[0] || null;
        } catch (error) {
            throw new Error('Failed to get user: ' + error.message);
        }
    }

    // Update user verification status
    static async verifyUser(email) {
        try {
            await promisePool.query(
                'UPDATE users SET is_verified = TRUE WHERE email = ?',
                [email]
            );

            return true;
        } catch (error) {
            throw new Error('Failed to verify user: ' + error.message);
        }
    }

    // Get user progress
    static async getUserProgress(userId) {
        try {

            // Get completed modules
            const [completedModules] = await promisePool.query(
                `SELECT m.*, up.completed_at, up.points_earned
                 FROM user_progress up
                 JOIN modules m ON up.module_id = m.id
                 WHERE up.user_id = ?`,
                [userId]
            );

            // Get total points
            const [pointsResult] = await promisePool.query(
                `SELECT SUM(points_earned) AS total_points
                 FROM user_progress
                 WHERE user_id = ?`,
                [userId]
            );

            // Get user badges
            const [badges] = await promisePool.query(
                `SELECT b.*, ub.earned_at
                 FROM user_badges ub
                 JOIN badges b ON ub.badge_id = b.id
                 WHERE ub.user_id = ?`,
                [userId]
            );

            // Get training sessions count
            const [sessions] = await promisePool.query(
                `SELECT COUNT(*) AS session_count
                 FROM training_sessions
                 WHERE user_id = ?`,
                [userId]
            );

            return {
                completedModules: completedModules,
                points: pointsResult[0]?.total_points || 0,
                badges: badges,
                trainingSessions: sessions[0]?.session_count || 0,
                lastSession:
                    completedModules.length > 0
                        ? completedModules[completedModules.length - 1].completed_at
                        : null
            };

        } catch (error) {
            throw new Error('Get user progress error: ' + error.message);
        }
    }
}

module.exports = UserModel;