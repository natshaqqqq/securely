// Database connection configuration

const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

// Create connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'securely_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

const promisePool = pool.promise();

// Test connection
async function testConnection() {
    try {
        const [rows] = await promisePool.query('SELECT 1');
        console.log('MySQL Database connected successfully');
        return true;
    } catch (error) {
        console.error('MySQL Database connection failed:', error.message);
        return false;
    }
}

module.exports = {
    pool,
    promisePool,
    testConnection
};