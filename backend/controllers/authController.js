// Auth Controller - Handles authentication with database

const UserModel = require('../models/UserModel');
const VerificationModel = require('../models/VerificationModel');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

// Email transporter configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Build verification email HTML (table-based, email-client-safe)
function buildVerificationEmail({ name, code }) {
    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
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
                Hello ${name || 'there'},
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

class AuthController {

    // Register new user
    static async register(req, res) {
        try {
            const { username, email, password } = req.body;

            if (!username || !email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Username, email, and password are required'
                });
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Please enter a valid email address'
                });
            }

            if (password.length < 8) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be at least 8 characters'
                });
            }

            const existingUser = await UserModel.getUserByEmail(email);
            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: 'Email already registered'
                });
            }

            const userId = await UserModel.createUser(username, email, password);

            res.status(201).json({
                success: true,
                message: 'User created successfully',
                data: { userId, email }
            });

        } catch (error) {
            console.error('Register error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Registration failed'
            });
        }
    }

    // Send verification code
    static async sendVerification(req, res) {
        try {
            const { email, name } = req.body;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is required'
                });
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Please enter a valid email address'
                });
            }

            // Generate 4-digit code
            const code = String(Math.floor(1000 + Math.random() * 9000));

            await VerificationModel.saveCode(email, code);

            const htmlContent = buildVerificationEmail({ name, code });

            const mailOptions = {
                from: `"Securely" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'Your Securely Verification Code',
                text: `Hello ${name || 'there'},\n\nYour verification code is: ${code}\n\nThis code will expire in 5 minutes.\n\nIf you didn't request this, please ignore this email.`,
                html: htmlContent
            };

            await transporter.sendMail(mailOptions);

            console.log(`✅ Verification code ${code} sent to ${email}`);

            res.json({
                success: true,
                message: 'Verification code sent successfully'
            });

        } catch (error) {
            console.error('Send verification error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to send verification code. Please try again.'
            });
        }
    }

    // Verify code
    static async verifyCode(req, res) {
        try {
            const { email, code } = req.body;

            if (!email || !code) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and code are required'
                });
            }

            const result = await VerificationModel.verifyCode(email, code);

            if (result.success) {
                res.json({
                    success: true,
                    message: 'Email verified successfully'
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: result.message
                });
            }

        } catch (error) {
            console.error('Verify code error:', error);
            res.status(500).json({
                success: false,
                message: 'Verification failed. Please try again.'
            });
        }
    }

    // Resend verification code
    static async resendVerification(req, res) {
        try {
            const { email, name } = req.body;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is required'
                });
            }

            const code = String(Math.floor(1000 + Math.random() * 9000));

            await VerificationModel.resendCode(email, code);

            const htmlContent = buildVerificationEmail({ name, code });

            const mailOptions = {
                from: `"Securely" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'Your New Securely Verification Code',
                text: `Hello ${name || 'there'},\n\nYour verification code is: ${code}\n\nThis code will expire in 5 minutes.\n\nIf you didn't request this, please ignore this email.`,
                html: htmlContent
            };

            await transporter.sendMail(mailOptions);

            console.log(`✅ New verification code ${code} sent to ${email}`);

            res.json({
                success: true,
                message: 'New verification code sent successfully'
            });

        } catch (error) {
            console.error('Resend verification error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to resend code. Please try again.'
            });
        }
    }

    // Get verification status
    static async getVerificationStatus(req, res) {
        try {
            const { email } = req.query;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is required'
                });
            }

            const status = await VerificationModel.getVerificationStatus(email);

            res.json({
                success: true,
                data: status
            });

        } catch (error) {
            console.error('Get verification status error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get verification status'
            });
        }
    }

    // Login
    static async login(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and password are required'
                });
            }

            const user = await UserModel.getUserByEmail(email);

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }

            if (user.password !== password) {
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

            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Login failed. Please try again.'
            });
        }
    }
}

module.exports = AuthController;;