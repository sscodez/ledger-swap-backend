import express from 'express';
import { 
  checkEmailServiceHealth, 
  sendTestEmail, 
  getEmailServiceConfig, 
  executeEmailCommand 
} from '../controllers/emailServiceController';
import { protect, isAdmin } from '../middleware/authMiddleware';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     EmailServiceHealth:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         status:
 *           type: string
 *           enum: [healthy, unhealthy]
 *         configuration:
 *           type: object
 *           properties:
 *             host:
 *               type: string
 *             port:
 *               type: number
 *             user:
 *               type: string
 *             configured:
 *               type: boolean
 *         connection:
 *           type: object
 *           properties:
 *             status:
 *               type: string
 *               enum: [connected, failed, not_configured, unknown]
 *             error:
 *               type: string
 *         mode:
 *           type: string
 *           enum: [smtp, mock]
 *         timestamp:
 *           type: string
 *           format: date-time
 * 
 *     EmailServiceConfig:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         configuration:
 *           type: object
 *           properties:
 *             host:
 *               type: string
 *             port:
 *               type: number
 *             user:
 *               type: string
 *             secure:
 *               type: boolean
 *             configured:
 *               type: boolean
 *             mode:
 *               type: string
 *               enum: [smtp, mock]
 *         availableEmailTypes:
 *           type: array
 *           items:
 *             type: string
 *         timestamp:
 *           type: string
 *           format: date-time
 * 
 *     SendTestEmailRequest:
 *       type: object
 *       required:
 *         - to
 *       properties:
 *         to:
 *           type: string
 *           format: email
 *           description: Recipient email address
 *         type:
 *           type: string
 *           enum: [test, password_reset, email_verification, welcome, support]
 *           default: test
 *           description: Type of test email to send
 *         subject:
 *           type: string
 *           description: Custom subject for test email
 *         message:
 *           type: string
 *           description: Custom message for test email
 * 
 *     EmailCommandRequest:
 *       type: object
 *       required:
 *         - command
 *       properties:
 *         command:
 *           type: string
 *           enum: [health_check, send_bulk_test, verify_connection]
 *           description: Command to execute
 *         parameters:
 *           type: object
 *           description: Command-specific parameters
 *           properties:
 *             recipients:
 *               type: array
 *               items:
 *                 type: string
 *                 format: email
 *               description: Array of email addresses for bulk operations
 *             emailType:
 *               type: string
 *               enum: [test, password_reset, email_verification, welcome, support]
 *               description: Type of email for bulk send
 */

/**
 * @swagger
 * /api/email-service/health:
 *   get:
 *     summary: Check email service health and connection status
 *     tags: [Email Service]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Email service health status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmailServiceHealth'
 *       500:
 *         description: Health check failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 status:
 *                   type: string
 *                   example: unhealthy
 *                 error:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/health', protect, isAdmin, checkEmailServiceHealth);

/**
 * @swagger
 * /api/email-service/config:
 *   get:
 *     summary: Get email service configuration
 *     tags: [Email Service]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Email service configuration
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmailServiceConfig'
 *       500:
 *         description: Failed to get configuration
 */
router.get('/config', protect, isAdmin, getEmailServiceConfig);

/**
 * @swagger
 * /api/email-service/test:
 *   post:
 *     summary: Send test email
 *     tags: [Email Service]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendTestEmailRequest'
 *           examples:
 *             basic_test:
 *               summary: Basic test email
 *               value:
 *                 to: "test@example.com"
 *                 type: "test"
 *             password_reset:
 *               summary: Password reset email
 *               value:
 *                 to: "user@example.com"
 *                 type: "password_reset"
 *             custom_test:
 *               summary: Custom test email
 *               value:
 *                 to: "admin@example.com"
 *                 type: "test"
 *                 subject: "Custom Test Subject"
 *                 message: "This is a custom test message"
 *     responses:
 *       200:
 *         description: Test email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Test Email sent successfully"
 *                 details:
 *                   type: object
 *                   properties:
 *                     to:
 *                       type: string
 *                     type:
 *                       type: string
 *                     emailType:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Failed to send test email
 */
router.post('/test', protect, isAdmin, sendTestEmail);

/**
 * @swagger
 * /api/email-service/execute:
 *   post:
 *     summary: Execute email service commands
 *     tags: [Email Service]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmailCommandRequest'
 *           examples:
 *             health_check:
 *               summary: Health check command
 *               value:
 *                 command: "health_check"
 *             verify_connection:
 *               summary: Verify SMTP connection
 *               value:
 *                 command: "verify_connection"
 *             bulk_test:
 *               summary: Send bulk test emails
 *               value:
 *                 command: "send_bulk_test"
 *                 parameters:
 *                   recipients: ["user1@example.com", "user2@example.com"]
 *                   emailType: "test"
 *     responses:
 *       200:
 *         description: Command executed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 result:
 *                   type: object
 *                   description: Command-specific result data
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid command or parameters
 *       500:
 *         description: Command execution failed
 */
router.post('/execute', protect, isAdmin, executeEmailCommand);

export default router;
