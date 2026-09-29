// Verification Model - Handles email verification codes in database

const { promisePool } = require('../config/database');

class VerificationModel {
    
    // Save verification code to database
    static async saveCode(email, code, expiresInMinutes = 15) {
        try {
            // Delete any existing codes for this email
            await promisePool.query(
                'DELETE FROM email_verifications WHERE email = ? AND is_used = FALSE',
                [email]
            );
            
            // Calculate expiration time
            const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
            
            // Insert new code
            const [result] = await promisePool.query(
                `INSERT INTO email_verifications (email, code, expires_at) 
                 VALUES (?, ?, ?)`,
                [email, code, expiresAt]
            );
            
            return result.insertId;
        } catch (error) {
            console.error('Save verification code error:', error);
            throw new Error('Failed to save verification code');
        }
    }
    
    // Verify code
    static async verifyCode(email, code) {
        try {
            // Find the code
            const [rows] = await promisePool.query(
                `SELECT * FROM email_verifications 
                 WHERE email = ? AND code = ? AND is_used = FALSE 
                 ORDER BY created_at DESC LIMIT 1`,
                [email, code]
            );
            
            if (rows.length === 0) {
                return { success: false, message: 'Invalid verification code' };
            }
            
            const record = rows[0];
            
            // Check if expired
            if (new Date() > new Date(record.expires_at)) {
                await promisePool.query(
                    'UPDATE email_verifications SET is_used = TRUE WHERE id = ?',
                    [record.id]
                );
                return { success: false, message: 'Verification code has expired' };
            }
            
            // Check attempts (max 3)
            if (record.attempts >= 3) {
                await promisePool.query(
                    'UPDATE email_verifications SET is_used = TRUE WHERE id = ?',
                    [record.id]
                );
                return { success: false, message: 'Too many failed attempts' };
            }
            
            // Increment attempts
            await promisePool.query(
                'UPDATE email_verifications SET attempts = attempts + 1 WHERE id = ?',
                [record.id]
            );
            
            // Mark as used
            await promisePool.query(
                'UPDATE email_verifications SET is_used = TRUE WHERE id = ?',
                [record.id]
            );
            
            // Mark user as verified
            await promisePool.query(
                'UPDATE users SET is_verified = TRUE WHERE email = ?',
                [email]
            );
            
            return { success: true, message: 'Email verified successfully' };
            
        } catch (error) {
            console.error('Verify code error:', error);
            throw new Error('Failed to verify code');
        }
    }
    
    // Resend verification code
    static async resendCode(email, code, expiresInMinutes = 15) {
        try {
            // Delete old unused codes
            await promisePool.query(
                'DELETE FROM email_verifications WHERE email = ? AND is_used = FALSE',
                [email]
            );
            
            // Calculate expiration time
            const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
            
            // Insert new code
            const [result] = await promisePool.query(
                `INSERT INTO email_verifications (email, code, expires_at) 
                 VALUES (?, ?, ?)`,
                [email, code, expiresAt]
            );
            
            return result.insertId;
        } catch (error) {
            console.error('Resend code error:', error);
            throw new Error('Failed to resend verification code');
        }
    }
    
    // Clean up expired codes (run this periodically)
    static async cleanupExpiredCodes() {
        try {
            const [result] = await promisePool.query(
                'UPDATE email_verifications SET is_used = TRUE WHERE expires_at < NOW() AND is_used = FALSE'
            );
            return result.affectedRows;
        } catch (error) {
            console.error('Cleanup expired codes error:', error);
            return 0;
        }
    }
    
    // Get verification status for a user
    static async getVerificationStatus(email) {
        try {
            const [rows] = await promisePool.query(
                'SELECT is_verified FROM users WHERE email = ?',
                [email]
            );
            
            if (rows.length === 0) {
                return { exists: false, isVerified: false };
            }
            
            return { exists: true, isVerified: rows[0].is_verified };
        } catch (error) {
            console.error('Get verification status error:', error);
            return { exists: false, isVerified: false };
        }
    }
}

module.exports = VerificationModel;