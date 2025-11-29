"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passport_1 = __importDefault(require("passport"));
const authController_1 = require("../controllers/authController");
const rateLimit_1 = require("../middleware/rateLimit");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
/**
 * @openapi
 * /api/auth/signup:
 *   post:
 *     summary: Sign up a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *             required: [email, password]
 *     responses:
 *       '201':
 *         description: User created
 */
router.post('/signup', authController_1.signup);
/**
 * @openapi
 * /api/auth/signin:
 *   post:
 *     summary: Sign in a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *             required: [email, password]
 *     responses:
 *       '200':
 *         description: Authenticated successfully
 *       '429':
 *         description: Too many login attempts
 */
router.post('/signin', rateLimit_1.loginRateLimit, authController_1.signin);
/**
 * @openapi
 * /api/auth/admin/signin:
 *   post:
 *     summary: Admin sign in
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *             required: [email, password]
 *     responses:
 *       '200':
 *         description: Authenticated successfully (admin only)
 *       '403':
 *         description: Admin access required
 *       '429':
 *         description: Too many login attempts
 */
router.post('/admin/signin', rateLimit_1.loginRateLimit, authController_1.adminSignin);
// Debug endpoint
router.get('/debug', authController_1.debugOAuth);
// Test endpoint to verify JWT and database
router.get('/test', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Test JWT generation
        const generateToken = require('../utils/generateToken').default;
        const testToken = generateToken('test-user-id');
        // Test database connection
        const User = require('../models/User').default;
        const userCount = yield User.countDocuments();
        // Test user creation (similar to OAuth flow)
        const testUser = {
            googleId: 'test-google-id',
            name: 'Test User',
            email: 'test@example.com'
        };
        res.json({
            message: 'System test',
            jwt: testToken ? 'JWT generation works' : 'JWT generation failed',
            database: `Connected - ${userCount} users`,
            userModel: 'User model accessible',
            testUserData: testUser,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            message: 'System test failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : 'No stack',
            timestamp: new Date().toISOString()
        });
    }
}));
// Google OAuth
/**
 * @openapi
 * /api/auth/google:
 *   get:
 *     summary: Start Google OAuth flow
 *     tags: [Auth]
 *     responses:
 *       '302':
 *         description: Redirect to Google
 */
router.get('/google', passport_1.default.authenticate('google', { scope: ['profile', 'email'] }));
/**
 * @openapi
 * /api/auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     tags: [Auth]
 *     responses:
 *       '200':
 *         description: Google OAuth success
 */
router.get('/google/callback', (req, res, next) => {
    console.log('Google callback route hit');
    console.log('Query params:', req.query);
    next();
}, passport_1.default.authenticate('google', {
    failureRedirect: 'https://ledgerswap.io/login?error=oauth_failed',
    session: false
}), authController_1.googleCallback, (error, req, res, next) => {
    console.error('Google OAuth route error:', error);
    res.redirect('https://ledgerswap.io/login?error=oauth_failed');
});
// Facebook OAuth
/**
 * @openapi
 * /api/auth/facebook:
 *   get:
 *     summary: Start Facebook OAuth flow
 *     tags: [Auth]
 *     responses:
 *       '302':
 *         description: Redirect to Facebook
 */
router.get('/facebook', passport_1.default.authenticate('facebook', { scope: ['email'] }));
/**
 * @openapi
 * /api/auth/facebook/callback:
 *   get:
 *     summary: Facebook OAuth callback
 *     tags: [Auth]
 *     responses:
 *       '200':
 *         description: Facebook OAuth success
 */
router.get('/facebook/callback', passport_1.default.authenticate('facebook', { failureRedirect: '/login' }), authController_1.facebookCallback);
// Password Reset Routes
/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     summary: Send password reset email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *             required: [email]
 *     responses:
 *       '200':
 *         description: Password reset email sent (if account exists)
 *       '400':
 *         description: Invalid email format
 *       '500':
 *         description: Server error
 */
router.post('/forgot-password', rateLimit_1.loginRateLimit, authController_1.forgotPassword);
/**
 * @openapi
 * /api/auth/verify-reset-code:
 *   post:
 *     summary: Verify password reset code
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               code:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *             required: [email, code]
 *     responses:
 *       '200':
 *         description: Verification code confirmed, reset token provided
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 resetToken:
 *                   type: string
 *                 tokenExpires:
 *                   type: number
 *       '400':
 *         description: Invalid or expired verification code
 *       '500':
 *         description: Server error
 */
router.post('/verify-reset-code', authController_1.verifyResetCode);
/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 6
 *             required: [token, password]
 *     responses:
 *       '200':
 *         description: Password reset successfully
 *       '400':
 *         description: Invalid or expired token
 *       '500':
 *         description: Server error
 */
router.post('/reset-password', authController_1.resetPassword);
// Email Verification Routes
/**
 * @openapi
 * /api/auth/verify-email:
 *   post:
 *     summary: Verify email address with token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *             required: [token]
 *     responses:
 *       '200':
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     emailVerified:
 *                       type: boolean
 *                 token:
 *                   type: string
 *       '400':
 *         description: Invalid or expired verification token
 *       '500':
 *         description: Server error
 */
router.post('/verify-email', authController_1.verifyEmail);
/**
 * @openapi
 * /api/auth/resend-verification:
 *   post:
 *     summary: Resend email verification
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *             required: [email]
 *     responses:
 *       '200':
 *         description: Verification email sent (if account exists and is unverified)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 tokenExpires:
 *                   type: number
 *       '400':
 *         description: Email already verified or OAuth account
 *       '500':
 *         description: Server error
 */
router.post('/resend-verification', rateLimit_1.loginRateLimit, authController_1.resendEmailVerification);
/**
 * @openapi
 * /api/auth/2fa/start:
 *   post:
 *     summary: Initiate two-factor authentication setup
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Returns QR code and secret for setup
 */
router.post('/2fa/start', authMiddleware_1.protect, authController_1.startTwoFactorSetup);
/**
 * @openapi
 * /api/auth/2fa/verify-setup:
 *   post:
 *     summary: Confirm and enable two-factor authentication
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 description: 6-digit TOTP code
 *             required: [token]
 *     responses:
 *       '200':
 *         description: Two-factor authentication enabled
 */
router.post('/2fa/verify-setup', authMiddleware_1.protect, authController_1.verifyTwoFactorSetup);
/**
 * @openapi
 * /api/auth/2fa/disable:
 *   post:
 *     summary: Disable two-factor authentication
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Two-factor authentication disabled
 */
router.post('/2fa/disable', authMiddleware_1.protect, authController_1.disableTwoFactor);
/**
 * @openapi
 * /api/auth/2fa/verify-login:
 *   post:
 *     summary: Verify TOTP during login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               loginToken:
 *                 type: string
 *               code:
 *                 type: string
 *             required: [loginToken, code]
 *     responses:
 *       '200':
 *         description: Login completed
 */
router.post('/2fa/verify-login', rateLimit_1.loginRateLimit, authController_1.verifyTwoFactorLogin);
exports.default = router;
