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
            
            // Validate email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Please enter a valid email address'
                });
            }
            
            // Validate password
            if (password.length < 8) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be at least 8 characters'
                });
            }
            
            // Check if user exists
            const existingUser = await UserModel.getUserByEmail(email);
            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: 'Email already registered'
                });
            }
            
            // Create user
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
    
    // Send verification code - ACCEPTS ANY EMAIL
    static async sendVerification(req, res) {
        try {
            const { email } = req.body;
            
            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is required'
                });
            }
            
            // Validate email format - ANY valid email works
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Please enter a valid email address'
                });
            }
            
            // Check if user exists
            const user = await UserModel.getUserByEmail(email);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'No account found with this email. Please register first.'
                });
            }
            
            // Generate 4-digit code
            const code = String(Math.floor(1000 + Math.random() * 9000));
            
            // Save to database
            await VerificationModel.saveCode(email, code);
            
            // Send email
            const htmlContent = `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 30px; background: #ffffff; border: 1px solid #e6e6ea; border-radius: 12px;">
                    <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #f0f0f5;">
                        <h1 style="color: #00095D; font-size: 32px; font-weight: 800; margin: 0;">SECURELY</h1>
                        <p style="color: #5b5f6b; font-size: 14px; margin: 5px 0 0 0;">Build safer digital habits</p>
                    </div>
                    
                    <div style="text-align: center;">
                        <h2 style="color: #14161f; font-size: 24px; font-weight: 700;">Verify Your Email</h2>
                        <p style="color: #5b5f6b; font-size: 16px; line-height: 1.6; margin: 15px 0 25px 0;">
                            Your verification code is:
                        </p>
                        <div style="background: #f4f4f6; padding: 25px; border-radius: 10px; margin: 20px 0; border: 2px dashed #d9ddff;">
                            <span style="font-size: 42px; font-weight: 800; color: #00095D; letter-spacing: 12px; font-family: 'Courier New', monospace;">${code}</span>
                        </div>
                        <p style="color: #5b5f6b; font-size: 14px;">This code will expire in <strong>5 minutes</strong></p>
                    </div>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #f0f0f5; text-align: center;">
                        <p style="color: #5b5f6b; font-size: 12px;">If you didn't request this, please ignore this email.</p>
                    </div>
                </div>
            `;
            
            const mailOptions = {
                from: `"Securely" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'Your Securely Verification Code',
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
            const { email } = req.body;
            
            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is required'
                });
            }
            
            // Generate new code
            const code = String(Math.floor(1000 + Math.random() * 9000));
            
            // Save to database
            await VerificationModel.resendCode(email, code);
            
            // Send email
            const htmlContent = `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 30px; background: #ffffff; border: 1px solid #e6e6ea; border-radius: 12px;">
                    <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #f0f0f5;">
                        <h1 style="color: #00095D; font-size: 32px; font-weight: 800; margin: 0;">SECURELY</h1>
                        <p style="color: #5b5f6b; font-size: 14px; margin: 5px 0 0 0;">Build safer digital habits</p>
                    </div>
                    
                    <div style="text-align: center;">
                        <h2 style="color: #14161f; font-size: 24px; font-weight: 700;">Your New Verification Code</h2>
                        <div style="background: #f4f4f6; padding: 25px; border-radius: 10px; margin: 20px 0; border: 2px dashed #d9ddff;">
                            <span style="font-size: 42px; font-weight: 800; color: #00095D; letter-spacing: 12px; font-family: 'Courier New', monospace;">${code}</span>
                        </div>
                        <p style="color: #5b5f6b; font-size: 14px;">This code will expire in <strong>5 minutes</strong></p>
                    </div>
                </div>
            `;
            
            const mailOptions = {
                from: `"Securely" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'Your New Securely Verification Code',
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
            
            // In production, compare hashed password
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

module.exports = AuthController;