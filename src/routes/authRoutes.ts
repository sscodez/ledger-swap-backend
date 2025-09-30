import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { signup, signin, googleCallback, facebookCallback, adminSignin, debugOAuth } from '../controllers/authController';
import { loginRateLimit } from '../middleware/rateLimit';

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

export default router;
