// resourceController.js - Handles resource list requests

const { promisePool } = require('../config/database');

class ResourceController {

    // GET /api/resources
        static async getAll(req, res) {
        try {
        const [rows] = await promisePool.query(
            `SELECT id, title, description, long_description,
                    services, url, category, position
             FROM resources
             ORDER BY category, position, id`
        );

        const grouped = rows.reduce((acc, r) => {
            if (!acc[r.category]) acc[r.category] = [];
            acc[r.category].push(r);
            return acc;
        }, {});

        res.json({
            success: true,
            data: { all: rows, grouped }
        });

    } catch (error) {
        console.error('getAll resources error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
    }
}

module.exports = ResourceController;

