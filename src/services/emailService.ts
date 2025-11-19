import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Email service with Name.com SMTP support
const createTransporter = () => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.log('=== EMAIL MOCK MODE (SMTP not configured) ===');
    return {
      sendMail: async (options: any) => {
        console.log('To:', options.to);
        console.log('Subject:', options.subject);
        console.log('HTML:', options.html);
        console.log('===============================');
        return Promise.resolve({ messageId: 'mock-message-id' });
      }
    };
  }

  // Create real transporter for Name.com or other SMTP providers
  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    tls: {
      rejectUnauthorized: false // For compatibility with some providers
    }
  });
};

// Generate 6-digit verification code
export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send password reset email with verification code
export const sendPasswordResetEmail = async (email: string, resetCode: string) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.SMTP_USER || 'admin@ledgerswap.io',
      to: email,
      subject: 'Password Reset Code - LedgerSwap',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #001233; margin: 0;">LedgerSwap</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Secure Cryptocurrency Exchange</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
            <h2 style="color: #001233; margin: 0 0 20px 0;">Password Reset Request</h2>
            <p style="color: #666; margin: 0 0 30px 0;">You have requested to reset your password for your LedgerSwap account.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">Your verification code is:</p>
              <div style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 8px; font-family: monospace;">
                ${resetCode}
              </div>
            </div>
            
            <p style="color: #666; font-size: 14px; margin: 20px 0 0 0;">
              <strong>This code will expire in 15 minutes.</strong><br>
              Enter this code on the password reset page to continue.
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              If you didn't request this password reset, please ignore this email.<br>
              This email was sent from LedgerSwap. Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Password reset code sent successfully to:', email);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
};

// Legacy function for backward compatibility
export const sendPasswordResetEmailWithToken = async (email: string, resetToken: string) => {
  try {
    const transporter = createTransporter();
    
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: process.env.SMTP_USER || 'admin@ledgerswap.io',
      to: email,
      subject: 'Password Reset Request - LedgerSwap',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #001233;">Password Reset Request</h2>
          <p>You have requested to reset your password for your LedgerSwap account.</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #007bff;">${resetUrl}</p>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            This email was sent from LedgerSwap. Please do not reply to this email.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Password reset email sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
};

export const sendPasswordResetConfirmation = async (email: string) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.SMTP_USER || 'admin@ledgerswap.io',
      to: email,
      subject: 'Password Reset Successful - LedgerSwap',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #001233; margin: 0;">LedgerSwap</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Secure Cryptocurrency Exchange</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
            <div style="width: 60px; height: 60px; background: #28a745; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
              <span style="color: white; font-size: 24px;">✓</span>
            </div>
            <h2 style="color: #28a745; margin: 0 0 20px 0;">Password Reset Successful</h2>
            <p style="color: #666; margin: 0 0 30px 0;">Your password has been successfully reset for your LedgerSwap account.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/login" 
                 style="background-color: #28a745; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Login to Your Account
              </a>
            </div>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              If you didn't make this change, please contact our support team immediately at admin@ledgerswap.io<br>
              This email was sent from LedgerSwap. Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Password reset confirmation email sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending password reset confirmation email:', error);
    return false;
  }
};

interface SupportEmailResult {
  success: boolean;
  mode: 'smtp' | 'mock';
  error?: string;
}

// Send admin support notification email
export const sendAdminSupportEmail = async (subject: string, message: string, fromEmail?: string): Promise<SupportEmailResult> => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@ledgerswap.io';
  const isSmtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.SMTP_USER || 'admin@ledgerswap.io',
      to: adminEmail,
      replyTo: fromEmail || undefined,
      subject: `[LedgerSwap Support] ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #001233; margin: 0;">LedgerSwap Support</h1>
            <p style="color: #666; margin: 5px 0 0 0;">New Support Request</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 10px;">
            <h3 style="color: #001233; margin: 0 0 15px 0;">Subject: ${subject}</h3>
            
            ${fromEmail ? `
            <div style="margin-bottom: 15px;">
              <strong>From:</strong> ${fromEmail}
            </div>
            ` : ''}
            
            <div style="margin-bottom: 15px;">
              <strong>Message:</strong>
            </div>
            
            <div style="background: white; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff;">
              ${message.replace(/\n/g, '<br>')}
            </div>
            
            <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
              <strong>Timestamp:</strong> ${new Date().toLocaleString()}<br>
              <strong>Source:</strong> Admin Panel Support Form
            </div>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    if (isSmtpConfigured) {
      console.log('Admin support email sent successfully to:', adminEmail);
    } else {
      console.log('Admin support email logged (SMTP not configured) to:', adminEmail);
    }

    return { success: true, mode: isSmtpConfigured ? 'smtp' : 'mock' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown email error';
    console.error('Error sending admin support email:', errorMessage);

    if (!isSmtpConfigured) {
      console.log('Email logged successfully in mock mode despite transporter error');
      return { success: true, mode: 'mock' };
    }

    return { success: false, mode: 'smtp', error: errorMessage };
  }
};
