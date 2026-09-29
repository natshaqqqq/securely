// SimulationModel.js - Handles simulation and result database operations

const { promisePool } = require('../config/database');

class SimulationModel {

        // ============================================
    // Get hub catalog
    // ============================================

    static async getCatalog() {
        const [rows] = await promisePool.query(
            `SELECT id, slug, title, description, page_url, position
             FROM simulations_catalog
             WHERE is_active = TRUE
             ORDER BY position, id`
        );
        return rows;
    }

    // ============================================
    // Get all simulations by type
    // ============================================

    static async getByType(type) {
        const [rows] = await promisePool.query(
            `SELECT id, type, sender_name, sender_address, timestamp_label,
                    subject, body_html,
                    url, page_title, context_note,
                    position
             FROM simulations
             WHERE type = ?
             ORDER BY position, id`,
            [type]
        );
        return rows;
    }


    // ============================================
    // Check a single answer
    // ============================================

    static async checkAnswer(id, userSaidThreat) {
        const [rows] = await promisePool.query(
            `SELECT id, is_threat, explanation
             FROM simulations
             WHERE id = ?`,
            [id]
        );

        if (!rows[0]) return null;

        const row = rows[0];
        const correct = (userSaidThreat ? 1 : 0) === row.is_threat;

        return {
            correct,
            isThreat: row.is_threat === 1,
            explanation: row.explanation
        };
    }


    // ============================================
    // Record a completed simulation attempt
    // ============================================

    static async recordResult(userId, type, score, total) {
        const percentage = Math.round((score / total) * 100);

        await promisePool.query(
            `INSERT INTO simulation_results
                (user_id, type, score, total, percentage)
             VALUES (?, ?, ?, ?, ?)`,
            [userId, type, score, total, percentage]
        );

        return { score, total, percentage };
    }


    // ============================================
    // Get latest result for a user + type
    // ============================================

    static async getLatestResult(userId, type) {
        const [rows] = await promisePool.query(
            `SELECT score, total, percentage, attempted_at
             FROM simulation_results
             WHERE user_id = ? AND type = ?
             ORDER BY attempted_at DESC
             LIMIT 1`,
            [userId, type]
        );
        return rows[0] || null;
    }
}

module.exports = SimulationModel;