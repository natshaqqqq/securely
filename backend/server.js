// server.js - Local development with cookies

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');

const { promisePool: pool } = require('./config/database');

const moduleRoutes = require('./routes/moduleRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const simulationRoutes = require('./routes/simulationRoutes');

const app = express();
const PORT = process.env.PORT || 3000;


// ============================================
// TEST DATABASE CONNECTION
// ============================================

async function testDBConnection() {
    try {
        const connection = await pool.getConnection();
        connection.release();
        console.log('✅ MySQL connected');
    } catch (error) {
        console.error('❌ MySQL connection error:', error.message);
    }
}

testDBConnection();


// ============================================
// EMAIL TRANSPORTER
// ============================================

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'sandbox.smtp.mailtrap.io',
    port: parseInt(process.env.EMAIL_PORT) || 2525,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});


// ============================================
// EMAIL TEMPLATE
// ============================================

function buildVerificationEmail(name, code) {
    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
</head>
<body style="margin:0; padding:0; background-color:#f4f4f6; font-family:Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f6; padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="max-width:520px; width:100%; background-color:#ffffff; border-radius:12px; border:1px solid #eaeaea;">
          <tr>
            <td style="padding:40px 40px 0 40px;">
              <p style="margin:0 0 8px 0; font-family:Arial, sans-serif; font-size:13px; font-weight:bold; letter-spacing:1px; color:#2a2c47; text-transform:uppercase;">
                SECURELY
              </p>
              <h1 style="margin:0 0 24px 0; font-family:Arial, sans-serif; font-size:26px; font-weight:bold; color:#4b3b9b; line-height:1.2;">
                Securely Verification
              </h1>
              <p style="margin:0 0 14px 0; font-family:Arial, sans-serif; font-size:15px; color:#14161f; line-height:1.6;">
                Hello ${name},
              </p>
              <p style="margin:0 0 14px 0; font-family:Arial, sans-serif; font-size:15px; color:#14161f; line-height:1.6;">
                Your verification code is:
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f0f4; border-radius:10px;">
                <tr>
                  <td align="center" style="padding:24px; font-family:'Courier New', Courier, monospace; font-size:38px; font-weight:bold; color:#4b3b9b; letter-spacing:8px;">
                    ${code}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 40px 40px;">
              <p style="margin:0 0 8px 0; font-family:Arial, sans-serif; font-size:13px; color:#5b5f6b; line-height:1.6;">
                This code will expire in 5 minutes.
              </p>
              <p style="margin:0; font-family:Arial, sans-serif; font-size:13px; color:#5b5f6b; line-height:1.6;">
                If you didn't request this, please ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
}


// ============================================
// CORS
// ============================================

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) {
            return callback(null, true);
        }

        if (origin.startsWith('http://localhost:')) {
            return callback(null, true);
        }

        if (origin.startsWith('http://127.0.0.1:')) {
            return callback(null, true);
        }

        callback(new Error('Not allowed by CORS'));
    },

    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));


// ============================================
// MIDDLEWARE
// ============================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


// ============================================
// SERVE FRONTEND
// ============================================

app.use(express.static(path.join(__dirname, '../frontend')));


// ============================================
// TEMPORARY REGISTRATION STORAGE
// ============================================

const pendingRegistrations = new Map();
const verificationCodes = new Map();


// ============================================
// ROUTES
// ============================================

app.use('/api/modules', moduleRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/simulations', simulationRoutes);


// ============================================
// TEST API
// ============================================

app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'Backend is working!'
    });
});


// ============================================
// REGISTER
// ============================================

// ---------- SEND VERIFICATION ----------

app.post('/api/auth/send-verification', async (req, res) => {

    try {

        const { name, email, password } = req.body;

        // Required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and password are required'
            });
        }

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email'
            });
        }

        // Validate password
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters'
            });
        }

        // Check existing user
        const [existing] = await pool.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Email already registered'
            });
        }

        // Generate verification code
        const code = String(
            Math.floor(1000 + Math.random() * 9000)
        );

        // Store pending registration
        pendingRegistrations.set(email, {
            name,
            email,
            password,
            timestamp: Date.now()
        });

        // Store verification code
        verificationCodes.set(email, {
            code,
            timestamp: Date.now(),
            attempts: 0
        });

        // HTML-escape the name
        const safeName = name.replace(/[&<>"']/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[character]);

        // Send email
        try {

            await transporter.sendMail({

                from: `"Securely" <no-reply@securely.com>`,
                to: email,
                subject: 'Securely Verification',

                text: `Hello ${name},

Your verification code is: ${code}

This code will expire in 5 minutes.

If you didn't request this, please ignore this email.`,

                html: buildVerificationEmail(
                    safeName,
                    code
                )

            });

        } catch (e) {
            console.error('Email error:', e.message);
        }

        res.json({
            success: true,
            message: 'Verification code sent',
            email
        });

    } catch (error) {

        console.error('Send verification error:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to send code'
        });

    }

});


// ============================================
// VERIFY CODE
// ============================================

app.post('/api/auth/verify-code', async (req, res) => {

    try {

        const { email, code } = req.body;

        const pendingUser = pendingRegistrations.get(email);
        const storedData = verificationCodes.get(email);

        if (!pendingUser || !storedData) {
            return res.status(400).json({
                success: false,
                message: 'No pending registration'
            });
        }

        // Check expiration
        if (
            Date.now() - storedData.timestamp >
            5 * 60 * 1000
        ) {

            return res.status(400).json({
                success: false,
                message: 'Code expired'
            });

        }

        // Check code
        if (storedData.code !== code) {

            storedData.attempts += 1;

            verificationCodes.set(
                email,
                storedData
            );

            return res.status(400).json({
                success: false,
                message: 'Invalid code'
            });

        }

        // Hash password
        const hashedPassword =
            await bcrypt.hash(
                pendingUser.password,
                10
            );

        // Insert user
        const [result] = await pool.execute(
            `INSERT INTO users
            (name, email, password_hash, is_verified, created_at, updated_at)
            VALUES (?, ?, ?, 1, NOW(), NOW())`,
            [
                pendingUser.name,
                pendingUser.email,
                hashedPassword
            ]
        );

        // Set login cookie
        res.cookie(
            'securely_user_id',
            String(result.insertId),
            {
                httpOnly: true,
                secure: false,
                sameSite: 'lax',
                maxAge: 24 * 60 * 60 * 1000
            }
        );

        // Remove temporary data
        verificationCodes.delete(email);
        pendingRegistrations.delete(email);

        res.json({
            success: true,
            message: 'Registration successful!',
            data: {
                id: result.insertId,
                name: pendingUser.name,
                email: pendingUser.email
            }
        });

    } catch (error) {

        console.error(
            'Verify code error:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Verification failed'
        });

    }

});


// ============================================
// RESEND VERIFICATION
// ============================================

app.post('/api/auth/resend-verification', async (req, res) => {

    try {

        const { email } = req.body;

        const pendingUser =
            pendingRegistrations.get(email);

        if (!pendingUser) {
            return res.status(400).json({
                success: false,
                message: 'No pending registration'
            });
        }

        // Generate new code
        const code = String(
            Math.floor(1000 + Math.random() * 9000)
        );

        verificationCodes.set(email, {
            code,
            timestamp: Date.now(),
            attempts: 0
        });

        // Get name
        const pendingName =
            pendingUser.name || 'there';

        // HTML-escape the name
        const safeName = pendingName.replace(
            /[&<>"']/g,
            character => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            })[character]
        );

        // Send email
        try {

            await transporter.sendMail({

                from: `"Securely" <no-reply@securely.com>`,
                to: email,
                subject: 'New Verification Code',

                text: `Hello ${pendingName},

Your verification code is: ${code}

This code will expire in 5 minutes.

If you didn't request this, please ignore this email.`,

                html: buildVerificationEmail(
                    safeName,
                    code
                )

            });

        } catch (e) {
            console.error(
                'Email error:',
                e.message
            );
        }

        res.json({
            success: true,
            message: 'New code sent'
        });

    } catch (error) {

        console.error(
            'Resend verification error:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Failed to resend'
        });

    }

});


// ============================================
// LOGIN
// ============================================

app.post('/api/auth/login', async (req, res) => {

    try {

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password required'
            });
        }

        const [users] = await pool.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const user = users[0];

        const isPasswordValid =
            await bcrypt.compare(
                password,
                user.password_hash
            );

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        if (!user.is_verified) {
            return res.status(403).json({
                success: false,
                message: 'Please verify your email first'
            });
        }

        res.cookie(
            'securely_user_id',
            String(user.id),
            {
                httpOnly: true,
                secure: false,
                sameSite: 'lax',
                maxAge: 24 * 60 * 60 * 1000
            }
        );

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                is_verified: user.is_verified,
                created_at: user.created_at
            }
        });

    } catch (error) {

        console.error(
            'Login error:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Login failed'
        });

    }

});


// ============================================
// GET CURRENT USER
// ============================================

app.get('/api/auth/me', async (req, res) => {

    try {

        const userId =
            req.cookies.securely_user_id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Not logged in'
            });
        }

        const [users] = await pool.execute(
            `SELECT id, name, email, is_verified, created_at
             FROM users
             WHERE id = ?`,
            [userId]
        );

        if (users.length === 0) {

            res.clearCookie(
                'securely_user_id'
            );

            return res.status(401).json({
                success: false,
                message: 'User not found'
            });

        }

        res.json({
            success: true,
            data: users[0]
        });

    } catch (error) {

        console.error(
            'Get current user error:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Failed'
        });

    }

});


// ============================================
// LOGOUT
// ============================================

app.post('/api/auth/logout', (req, res) => {

    res.clearCookie(
        'securely_user_id'
    );

    res.json({
        success: true,
        message: 'Logged out'
    });

});


// ============================================
// DEBUG USERS
// ============================================

app.get('/api/debug/users', async (req, res) => {

    try {

        const [users] = await pool.execute(
            `SELECT id, name, email, is_verified
             FROM users
             ORDER BY id DESC`
        );

        res.json({
            total: users.length,
            users
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: 'Failed'
        });

    }

});


// ============================================
// START SERVER
// ============================================

// IMPORTANT FOR RENDER:
// Use 0.0.0.0 instead of 127.0.0.1
// so Render can access the server.

app.listen(
    PORT,
    '0.0.0.0',
    () => {
        console.log(
            `Securely server is running on port ${PORT}`
        );
    }
);