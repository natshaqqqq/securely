// simulationController.js - Handles simulation API requests

const SimulationModel = require('../models/SimulationModel');

class SimulationController {

        // ============================================
    // GET /api/simulations  (hub catalog)
    // ============================================

    static async getCatalog(req, res) {
        try {
            const rows = await SimulationModel.getCatalog();
            res.json({ success: true, data: rows });
        } catch (error) {
            console.error('getCatalog FAILED:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // ============================================
    // GET /api/simulations/:type
    // ============================================

    static async getByType(req, res) {
        try {
            const type = req.params.type;

            if (!['phish', 'sms', 'url'].includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid simulation type'
                });
            }

            const rows = await SimulationModel.getByType(type);

            // Strip out is_threat and explanation — user should not see the answer
            const cleaned = rows.map(r => ({
                id: r.id,
                type: r.type,
                sender_name: r.sender_name,
                sender_address: r.sender_address,
                timestamp_label: r.timestamp_label,
                subject: r.subject,
                body_html: r.body_html,
                url: r.url,
                page_title: r.page_title,
                context_note: r.context_note,
                position: r.position
            }));

            res.json({ success: true, data: cleaned });

        } catch (error) {
            console.error('getByType FAILED:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }


    // ============================================
    // POST /api/simulations/check
    // ============================================

    static async check(req, res) {
        try {
            const { id, userSaidThreat } = req.body;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'id is required'
                });
            }

            const result = await SimulationModel.checkAnswer(id, !!userSaidThreat);

            if (!result) {
                return res.status(404).json({
                    success: false,
                    message: 'Simulation not found'
                });
            }

            res.json({ success: true, data: result });

        } catch (error) {
            console.error('check FAILED:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }


    // ============================================
    // POST /api/simulations/result
    // ============================================

    static async saveResult(req, res) {
        try {
            const { userId, type, score, total } = req.body;

            if (!userId || !type || score === undefined || !total) {
                return res.status(400).json({
                    success: false,
                    message: 'userId, type, score, and total are required'
                });
            }

            if (!['phish', 'sms', 'url'].includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid simulation type'
                });
            }

            const result = await SimulationModel.recordResult(
                userId, type, score, total
            );

            res.json({ success: true, data: result });

        } catch (error) {
            console.error('saveResult FAILED:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = SimulationController;