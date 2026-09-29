// server.js - With MySQL database, Mailtrap, bcrypt password hashing, and JWT auth

// Load .env FIRST
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

// Imports
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Shared DB pool
const { promisePool: pool } = require('./config/database');

// Routes
const moduleRoutes = require('./routes/moduleRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const simulationRoutes = require('./routes/simulationRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-render-env';


// ============================================
// Test database connection
// ============================================

async function testDBConnection() {
    try {
        const connection = await pool.getConnection();
        connection.release();
        console.log('✅ MySQL connected');
    } catch (error) {
        console.error('❌ MySQL connection error:', error.message);
        console.error('Please check:');
        console.error('1. MySQL is installed and running');
        console.error('2. DB_HOST, DB_USER, DB_PASSWORD, DB_NAME are correct in .env');
        console.error('3. The database exists');
    }
}

testDBConnection();


// ============================================
// Email Configuration - Mailtrap
// ============================================

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'sandbox.smtp.mailtrap.io',
    port: parseInt(process.env.EMAIL_PORT) || 2525,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

transporter.verify((error) => {
    if (error) {
        console.error('Email configuration error:', error.message);
    }
});


// ============================================
// CORS Configuration - Allow all Vercel URLs
// ============================================

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (origin.endsWith('.vercel.app')) return callback(null, true);
        if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));


// ============================================
// In-memory storage
// ============================================

const pendingRegistrations = new Map();
const verificationCodes = new Map();


// ============================================
// API Routes
// ============================================

app.use('/api/modules', moduleRoutes);
console.log('Module routes registered at /api/modules');

app.use('/api/resources', resourceRoutes);
console.log('Resource routes registered at /api/resources');

app.use('/api/simulations', simulationRoutes);
console.log('Simulation routes registered at /api/simulations');


app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Securely API is running',
        timestamp: new Date().toISOString()
    });
});


app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'Backend is working!'
    });
});


// ============================================
// TEST EMAIL ENDPOINT
// ============================================

app.post('/api/test-email', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        await transporter.sendMail({
            from: `"Securely Test" <${process.env.EMAIL_FROM || 'no-reply@securely.com'}>`,
            to: email,
            subject: 'Test Email from Securely',
            html: `
                <div style="font-family: Arial; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <h2 style="color: #4F46E5;">Email is Working!</h2>
                    <p>If you received this email, your Mailtrap configuration is correct!</p>
                </div>
            `
        });

        res.json({ success: true, message: 'Test email sent! Check your Mailtrap inbox.' });

    } catch (error) {
        console.error('Test email error:', error.message);
        res.status(500).json({ success: false, message: error.message || 'Failed to send test email' });
    }
});


// ============================================
// Auth Routes
// ============================================

app.post('/api/auth/send-verification', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
        }

        if (name.length < 2 || name.length > 100) {
            return res.status(400).json({ success: false, message: 'Name must be between 2 and 100 characters' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
        }

        if (password.length < 8) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
        }

        const [existingUsers] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);

        if (existingUsers.length > 0) {
            return res.status(409).json({ success: false, message: 'Email already registered. Please login.' });
        }

        const code = String(Math.floor(1000 + Math.random() * 9000));

        pendingRegistrations.set(email, { name, email, password, timestamp: Date.now() });
        verificationCodes.set(email, { code, timestamp: Date.now(), attempts: 0 });

        try {
            await transporter.sendMail({
                from: `"Securely" <${process.env.EMAIL_FROM || 'no-reply@securely.com'}>`,
                to: email,
                subject: 'Your Securely Verification Code',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                        <h2 style="color: #4F46E5;">Securely Verification</h2>
                        <p style="color: #333; font-size: 16px;">Hello ${name},</p>
                        <p>Your verification code is:</p>
                        <div style="font-size: 42px; font-weight: bold; color: #4F46E5; padding: 20px; background: #f3f4f6; border-radius: 8px; text-align: center; letter-spacing: 10px;">
                            ${code}
                        </div>
                        <p style="color: #6b7280; font-size: 14px;">This code will expire in 5 minutes.</p>
                    </div>
                `
            });
        } catch (emailError) {
            console.error('Email sending failed:', emailError.message);
        }

        res.json({ success: true, message: 'Verification code sent to your email!', email });

    } catch (error) {
        console.error('Send verification error:', error);
        res.status(500).json({ success: false, message: 'Failed to send verification code' });
    }
});


app.post('/api/auth/verify-code', async (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({ success: false, message: 'Email and code are required' });
        }

        const pendingUser = pendingRegistrations.get(email);
        if (!pendingUser) {
            return res.status(400).json({ success: false, message: 'No pending registration found. Please register again.' });
        }

        const storedData = verificationCodes.get(email);
        if (!storedData) {
            return res.status(400).json({ success: false, message: 'No verification code found. Please request a new one.' });
        }

        if (Date.now() - storedData.timestamp > 5 * 60 * 1000) {
            verificationCodes.delete(email);
            pendingRegistrations.delete(email);
            return res.status(400).json({ success: false, message: 'Verification code has expired. Please register again.' });
        }

        if (storedData.attempts >= 3) {
            verificationCodes.delete(email);
            pendingRegistrations.delete(email);
            return res.status(400).json({ success: false, message: 'Too many failed attempts. Please register again.' });
        }

        if (storedData.code !== code) {
            storedData.attempts += 1;
            verificationCodes.set(email, storedData);
            return res.status(400).json({
                success: false,
                message: 'Invalid code. ' + (3 - storedData.attempts) + ' attempt(s) remaining.'
            });
        }

        const hashedPassword = await bcrypt.hash(pendingUser.password, 10);

        const [result] = await pool.execute(
            `INSERT INTO users (name, email, password_hash, is_verified, created_at, updated_at)
             VALUES (?, ?, ?, 1, NOW(), NOW())`,
            [pendingUser.name, pendingUser.email, hashedPassword]
        );

        const token = jwt.sign({ userId: result.insertId }, JWT_SECRET, { expiresIn: '7d' });

        verificationCodes.delete(email);
        pendingRegistrations.delete(email);

        res.json({
            success: true,
            message: 'Registration successful!',
            token,
            data: {
                id: result.insertId,
                name: pendingUser.name,
                email: pendingUser.email
            }
        });

    } catch (error) {
        console.error('Verify code error:', error);
        res.status(500).json({ success: false, message: 'Verification failed' });
    }
});


app.post('/api/auth/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const pendingUser = pendingRegistrations.get(email);
        if (!pendingUser) {
            return res.status(400).json({ success: false, message: 'No pending registration found. Please register again.' });
        }

        const code = String(Math.floor(1000 + Math.random() * 9000));
        verificationCodes.set(email, { code, timestamp: Date.now(), attempts: 0 });

        try {
            await transporter.sendMail({
                from: `"Securely" <${process.env.EMAIL_FROM || 'no-reply@securely.com'}>`,
                to: email,
                subject: 'Your New Securely Verification Code',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                        <h2 style="color: #4F46E5;">New Verification Code</h2>
                        <div style="font-size: 42px; font-weight: bold; color: #4F46E5; padding: 20px; background: #f3f4f6; border-radius: 8px; text-align: center; letter-spacing: 10px;">
                            ${code}
                        </div>
                        <p style="color: #6b7280; font-size: 14px;">This code will expire in 5 minutes.</p>
                    </div>
                `
            });
        } catch (emailError) {
            console.error('Email sending failed:', emailError.message);
        }

        res.json({ success: true, message: 'New verification code sent' });

    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({ success: false, message: 'Failed to resend code' });
    }
});


// ---------- LOGIN ----------
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const user = users[0];
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        if (!user.is_verified) {
            return res.status(403).json({ success: false, message: 'Please verify your email first' });
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            success: true,
            message: 'Login successful',
            token,
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                is_verified: user.is_verified,
                created_at: user.created_at
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Login failed' });
    }
});


// ---------- ME ----------
app.get('/api/auth/me', async (req, res) => {
    try {
        const auth = req.headers.authorization || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

        if (!token) {
            return res.status(401).json({ success: false, message: 'Not logged in' });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (e) {
            return res.status(401).json({ success: false, message: 'Invalid session' });
        }

        const [users] = await pool.execute(
            `SELECT id, name, email, is_verified, created_at FROM users WHERE id = ?`,
            [decoded.userId]
        );

        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, data: users[0] });

    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({ success: false, message: 'Failed to get current user' });
    }
});


// ---------- LOGOUT ----------
app.post('/api/auth/logout', (req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
});


// ============================================
// DEBUG ROUTES
// ============================================

app.get('/api/debug/users', async (req, res) => {
    try {
        const [users] = await pool.execute(
            `SELECT id, name, email, is_verified, created_at, updated_at
             FROM users ORDER BY id DESC`
        );
        res.json({ total: users.length, users });
    } catch (error) {
        console.error('Debug users error:', error);
        res.status(500).json({ success: false, message: 'Failed to get users' });
    }
});

app.get('/api/debug/pending', (req, res) => {
    const pending = [];
    for (let [email, data] of pendingRegistrations) {
        pending.push({
            email,
            name: data.name,
            timestamp: data.timestamp,
            age: Math.floor((Date.now() - data.timestamp) / 1000 / 60) + ' minutes ago'
        });
    }
    res.json({ pending });
});

app.get('/api/debug/codes', (req, res) => {
    const codes = [];
    for (let [email, data] of verificationCodes) {
        codes.push({
            email,
            code: data.code,
            attempts: data.attempts,
            expiresIn: Math.max(0, Math.floor((5 * 60 * 1000 - (Date.now() - data.timestamp)) / 1000)) + ' seconds'
        });
    }
    res.json({ codes });
});


// ============================================
// Start Server
// ============================================

app.listen(PORT, () => {
    console.log(`Securely server is running on http://localhost:${PORT}`);
});