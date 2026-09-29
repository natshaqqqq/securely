// Database connection configuration

const mysql = require('mysql2');
const dotenv = require('dotenv');
const fs = require('fs');        
const path = require('path');    

dotenv.config();

// Read the CA certificate file
const caCertPath = path.join(__dirname, '..', 'certs', 'ca.pem');
const sslOptions = {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
};

// If the cert file exists, use it
if (fs.existsSync(caCertPath)) {
    sslOptions.ca = fs.readFileSync(caCertPath);
    console.log('✅ Using CA certificate from certs/ca.pem');
} else {
    console.warn('⚠️ No CA certificate found, connecting without it (may fail)');
}

// Create connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'securely_db',
    port: process.env.DB_PORT || 4000,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    ssl: sslOptions
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