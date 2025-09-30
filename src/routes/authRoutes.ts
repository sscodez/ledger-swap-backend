import { Router } from 'express';
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
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), googleCallback);

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
