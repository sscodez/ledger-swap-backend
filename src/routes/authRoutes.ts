import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { signup, signin, googleCallback, facebookCallback, adminSignin, debugOAuth, forgotPassword, verifyResetCode, resetPassword, verifyEmail, resendEmailVerification, startTwoFactorSetup, verifyTwoFactorSetup, disableTwoFactor, verifyTwoFactorLogin, changePassword } from '../controllers/authController';
import { loginRateLimit } from '../middleware/rateLimit';
import { protect } from '../middleware/authMiddleware';

const router = Router();

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
router.post('/signup', signup);

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
router.post('/signin', loginRateLimit, signin);

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
router.post('/admin/signin', loginRateLimit, adminSignin);

// Debug endpoint
router.get('/debug', debugOAuth);

// Test endpoint to verify JWT and database
router.get('/test', async (req, res) => {
  try {
    // Test JWT generation
    const generateToken = require('../utils/generateToken').default;
    const testToken = generateToken('test-user-id');
    
    // Test database connection
    const User = require('../models/User').default;
    const userCount = await User.countDocuments();
    
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
  } catch (error) {
    res.status(500).json({
      message: 'System test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
      timestamp: new Date().toISOString()
    });
  }
});

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
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
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
router.get('/google/callback', 
  (req: Request, res: Response, next: NextFunction) => {
    console.log('Google callback route hit');
    console.log('Query params:', req.query);
    next();
  },
  passport.authenticate('google', { 
    failureRedirect: 'https://ledgerswap.io/login?error=oauth_failed',
    session: false 
  }), 
  googleCallback,
  (error: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Google OAuth route error:', error);
    res.redirect('https://ledgerswap.io/login?error=oauth_failed');
  }
);

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
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
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
router.get('/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/login' }), facebookCallback);

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
router.post('/forgot-password', loginRateLimit, forgotPassword);

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
router.post('/verify-reset-code', verifyResetCode);

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
router.post('/reset-password', resetPassword);

/**
 * @openapi
 * /api/auth/change-password:
 *   post:
 *     summary: Change password for authenticated user
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
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *             required: [currentPassword, newPassword]
 *     responses:
 *       '200':
 *         description: Password changed successfully
 */
router.post('/change-password', protect, changePassword);

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
router.post('/verify-email', verifyEmail);

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
router.post('/resend-verification', loginRateLimit, resendEmailVerification);

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
router.post('/2fa/start', protect, startTwoFactorSetup);

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
router.post('/2fa/verify-setup', protect, verifyTwoFactorSetup);

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
router.post('/2fa/disable', protect, disableTwoFactor);

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
router.post('/2fa/verify-login', loginRateLimit, verifyTwoFactorLogin);

export default router;
