import { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import { 
  sendPasswordResetEmail, 
  sendEmailVerification, 
  sendWelcomeEmail, 
  sendAdminSupportEmail,
  generateVerificationCode,
  generateEmailVerificationToken
} from '../services/emailService';

// Email service health check
export const checkEmailServiceHealth = async (req: Request, res: Response) => {
  try {
    const smtpHost = 'smtp.titan.email';
    const smtpPort = 587;
    const smtpUser = "admin@ledgerswap.io";
    const smtpPass = "Matrix$345";

    // Check if SMTP configuration is available
    const isConfigured = !!(smtpHost && smtpUser && smtpPass);
    
    let connectionStatus = 'unknown';
    let connectionError = null;

    if (isConfigured) {
      try {
        // Create transporter to test connection
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        // Verify connection
        await transporter.verify();
        connectionStatus = 'connected';
      } catch (error) {
        connectionStatus = 'failed';
        connectionError = error instanceof Error ? error.message : 'Unknown connection error';
      }
    } else {
      connectionStatus = 'not_configured';
    }

    res.json({
      success: true,
      status: 'healthy',
      configuration: {
        host: smtpHost || 'not_set',
        port: smtpPort || 'not_set',
        user: smtpUser ? smtpUser.replace(/(.{2}).*(@.*)/, '$1***$2') : 'not_set',
        configured: isConfigured
      },
      connection: {
        status: connectionStatus,
        error: connectionError
      },
      mode: isConfigured ? 'smtp' : 'mock',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Email service health check error:', error);
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
};

// Send test email
export const sendTestEmail = async (req: Request, res: Response) => {
  try {
    const { to, type = 'test', subject, message } = req.body;

    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Recipient email address is required'
      });
    }

    let result = false;
    let emailType = '';

    switch (type) {
      case 'password_reset':
        const resetCode = generateVerificationCode();
        result = await sendPasswordResetEmail(to, resetCode);
        emailType = 'Password Reset';
        break;

      case 'email_verification':
        const verificationToken = generateEmailVerificationToken();
        result = await sendEmailVerification(to, verificationToken);
        emailType = 'Email Verification';
        break;

      case 'welcome':
        result = await sendWelcomeEmail(to, 'Test User');
        emailType = 'Welcome Email';
        break;

      case 'support':
        const supportResult = await sendAdminSupportEmail(
          subject || 'Test Support Email',
          message || 'This is a test support email from the API.',
          to
        );
        result = supportResult.success;
        emailType = 'Support Email';
        break;

      case 'test':
      default:
        // Send custom test email
        const smtpHost = 'smtp.titan.email';
        const smtpUser = "admin@ledgerswap.io";
        const smtpPass = "Qwerty$345";

        if (!smtpHost || !smtpUser || !smtpPass) {
          console.log('=== TEST EMAIL MOCK MODE ===');
          console.log('To:', to);
          console.log('Subject:', subject || 'Test Email from LedgerSwap API');
          console.log('Message:', message || 'This is a test email sent from the LedgerSwap email service API.');
          console.log('===============================');
          result = true;
        } else {
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: 587,
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
          });

          await transporter.sendMail({
            from: smtpUser,
            to: to,
            subject: subject || 'Test Email from LedgerSwap API',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #001233; margin: 0;">LedgerSwap</h1>
                  <p style="color: #666; margin: 5px 0 0 0;">Email Service Test</p>
                </div>
                
                <div style="background: #f8f9fa; padding: 30px; border-radius: 10px;">
                  <h2 style="color: #001233; margin: 0 0 20px 0;">Test Email Successful</h2>
                  <p style="color: #666; margin: 0 0 20px 0;">
                    ${message || 'This is a test email sent from the LedgerSwap email service API. If you received this email, the email service is working correctly.'}
                  </p>
                  
                  <div style="background: white; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745;">
                    <strong>Email Service Status:</strong> ✅ Working<br>
                    <strong>Timestamp:</strong> ${new Date().toLocaleString()}<br>
                    <strong>Test Type:</strong> ${type}
                  </div>
                </div>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                  <p style="color: #666; font-size: 12px; margin: 0;">
                    This is an automated test email from LedgerSwap Email Service API.<br>
                    Please do not reply to this email.
                  </p>
                </div>
              </div>
            `,
          });
          result = true;
        }
        emailType = 'Test Email';
        break;
    }

    if (result) {
      res.json({
        success: true,
        message: `${emailType} sent successfully`,
        details: {
          to: to,
          type: type,
          emailType: emailType,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: `Failed to send ${emailType.toLowerCase()}`,
        details: {
          to: to,
          type: type,
          emailType: emailType
        }
      });
    }
  } catch (error) {
    console.error('Send test email error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
};

// Get email service configuration
export const getEmailServiceConfig = async (req: Request, res: Response) => {
  try {
    const smtpHost = 'smtp.titan.email';
    const smtpPort = 587;
    const smtpUser = "admin@ledgerswap.io";
    const smtpPass = "Matrix$345";

    res.json({
      success: true,
      configuration: {
        host: smtpHost || 'not_set',
        port: smtpPort || 'not_set',
        user: smtpUser ? smtpUser.replace(/(.{2}).*(@.*)/, '$1***$2') : 'not_set',
        secure: false,
        configured: !!(smtpHost && smtpUser && smtpPass),
        mode: !!(smtpHost && smtpUser && smtpPass) ? 'smtp' : 'mock'
      },
      availableEmailTypes: [
        'test',
        'password_reset',
        'email_verification',
        'welcome',
        'support'
      ],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get email service config error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
};

// Execute email command (batch operations)
export const executeEmailCommand = async (req: Request, res: Response) => {
  try {
    const { command, parameters } = req.body;

    if (!command) {
      return res.status(400).json({
        success: false,
        error: 'Command is required'
      });
    }

    let result: any = {};

    switch (command) {
      case 'health_check':
        // Redirect to health check
        return checkEmailServiceHealth(req, res);

      case 'send_bulk_test':
        const { recipients, emailType = 'test' } = parameters || {};
        if (!recipients || !Array.isArray(recipients)) {
          return res.status(400).json({
            success: false,
            error: 'Recipients array is required for bulk send'
          });
        }

        const bulkResults = [];
        for (const recipient of recipients) {
          try {
            // Create a mock request for each recipient
            const mockReq = {
              body: {
                to: recipient,
                type: emailType,
                subject: `Bulk Test Email - ${new Date().toLocaleString()}`,
                message: `This is a bulk test email sent to ${recipient}`
              }
            } as Request;

            // We'll simulate the send without actually calling the full function
            // to avoid response conflicts
            let sendResult = false;
            if (emailType === 'test') {
              const resetCode = generateVerificationCode();
              sendResult = await sendPasswordResetEmail(recipient, resetCode);
            }

            bulkResults.push({
              recipient: recipient,
              success: sendResult,
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            bulkResults.push({
              recipient: recipient,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString()
            });
          }
        }

        result = {
          command: 'send_bulk_test',
          totalRecipients: recipients.length,
          successful: bulkResults.filter(r => r.success).length,
          failed: bulkResults.filter(r => !r.success).length,
          results: bulkResults
        };
        break;

      case 'verify_connection':
        try {
          const smtpHost = 'smtp.titan.email';
          const smtpUser = "admin@ledgerswap.io";
          const smtpPass = "Matrix$345";

          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: 587,
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
          });

          await transporter.verify();
          result = {
            command: 'verify_connection',
            status: 'success',
            message: 'SMTP connection verified successfully'
          };
        } catch (error) {
          result = {
            command: 'verify_connection',
            status: 'failed',
            error: error instanceof Error ? error.message : 'Connection failed'
          };
        }
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown command: ${command}`,
          availableCommands: ['health_check', 'send_bulk_test', 'verify_connection']
        });
    }

    res.json({
      success: true,
      result: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Execute email command error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
};
