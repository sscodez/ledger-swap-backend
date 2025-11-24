import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Email service with Titan email SMTP support
const createTransporter = () => {
  const smtpHost = process.env.SMTP_HOST || 'smtp.titan.email';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const smtpUser = process.env.SMTP_USER || "admin@ledgerswap.io";
  const smtpPass = process.env.SMTP_PASS;
  const smtpSecure = process.env.SMTP_SECURE === 'true' || false;

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

  // Create real transporter for Titan email SMTP
  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure, // false for port 587, true for port 465
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    tls: {
      rejectUnauthorized: false // For compatibility with Titan email
    }
  });
};

// Generate 6-digit verification code
export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate email verification token
export const generateEmailVerificationToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Send password reset email with verification code
export const sendPasswordResetEmail = async (email: string, resetCode: string) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: 'admin@ledgerswap.io',
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
      to: fromEmail,
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

// Send email verification email
export const sendEmailVerification = async (email: string, verificationToken: string) => {
  try {
    const transporter = createTransporter();
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      from: process.env.SMTP_USER || 'admin@ledgerswap.io',
      to: email,
      subject: 'Verify Your Email - LedgerSwap',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #001233; margin: 0;">LedgerSwap</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Secure Cryptocurrency Exchange</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
            <div style="width: 60px; height: 60px; background: #007bff; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
              <span style="color: white; font-size: 24px;">✉</span>
            </div>
            <h2 style="color: #001233; margin: 0 0 20px 0;">Verify Your Email Address</h2>
            <p style="color: #666; margin: 0 0 30px 0;">Welcome to LedgerSwap! Please verify your email address to complete your account setup and start trading securely.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background-color: #007bff; color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
                Verify Email Address
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin: 20px 0 0 0;">
              <strong>This link will expire in 24 hours.</strong><br>
              If the button doesn't work, copy and paste this link in your browser:
            </p>
            <p style="word-break: break-all; color: #007bff; font-size: 12px; margin: 10px 0;">${verificationUrl}</p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              If you didn't create an account with LedgerSwap, please ignore this email.<br>
              This email was sent from LedgerSwap. Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Email verification sent successfully to:', email);
    return true;
  } catch (error) {
    console.error('Error sending email verification:', error);
    return false;
  }
};

// Send welcome email after verification
export const sendWelcomeEmail = async (email: string, name: string) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.SMTP_USER || 'admin@ledgerswap.io',
      to: email,
      subject: 'Welcome to LedgerSwap - Email Verified!',
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
            <h2 style="color: #28a745; margin: 0 0 20px 0;">Welcome to LedgerSwap, ${name}!</h2>
            <p style="color: #666; margin: 0 0 30px 0;">Your email has been successfully verified and your account is now active. You can start trading cryptocurrencies securely on our platform.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/dashboard" 
                 style="background-color: #28a745; color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px; margin-right: 10px;">
                Go to Dashboard
              </a>
              <a href="${process.env.FRONTEND_URL}/exchange" 
                 style="background-color: #007bff; color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
                Start Trading
              </a>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: left;">
              <h3 style="color: #001233; margin: 0 0 15px 0;">What's Next?</h3>
              <ul style="color: #666; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Explore our secure exchange platform</li>
                <li style="margin-bottom: 8px;">Connect your crypto wallets</li>
                <li style="margin-bottom: 8px;">Start trading with competitive rates</li>
                <li style="margin-bottom: 8px;">Track your transaction history</li>
              </ul>
            </div>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              Need help? Contact our support team at admin@ledgerswap.io<br>
              This email was sent from LedgerSwap. Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Welcome email sent successfully to:', email);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
};

// Send corridor confirmation email for contact form submissions
export const sendCorridorConfirmationEmail = async (email: string, name: string) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.SMTP_USER || 'admin@ledgerswap.io',
      to: email,
      subject: 'Your Message Has Entered the Corridor',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%); color: #ffffff;">
          <div style="text-align: center; margin-bottom: 40px; padding: 30px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
            <h1 style="color: #00d4ff; margin: 0; font-size: 28px; font-weight: 300; letter-spacing: 2px;">LedgerSwap</h1>
            <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Secure Corridor</p>
          </div>
          
          <div style="background: rgba(0, 212, 255, 0.05); padding: 40px 30px; border-radius: 12px; border: 1px solid rgba(0, 212, 255, 0.2); text-align: center;">
            <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%); border-radius: 50%; margin: 0 auto 25px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 32px rgba(0, 212, 255, 0.3);">
              <span style="color: #0f0f23; font-size: 32px; font-weight: bold;">🔒</span>
            </div>
            
            <h2 style="color: #00d4ff; margin: 0 0 25px 0; font-size: 24px; font-weight: 400;">Your Message Has Entered the Corridor</h2>
            
            <div style="background: rgba(15, 15, 35, 0.8); padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #00d4ff;">
              <p style="color: #ffffff; margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">
                Thank you for reaching out to LedgerSwap.<br>
                Your message has entered the Corridor and is now protected under our <strong style="color: #00d4ff;">Zero-Log Support Layer</strong>.
              </p>
              
              <p style="color: rgba(255,255,255,0.9); margin: 15px 0; font-size: 15px; line-height: 1.6;">
                Our guardian team reviews all inquiries in the order they align with system flow.<br>
                We will respond if your request requires direct action.
              </p>
              
              <p style="color: rgba(255,255,255,0.8); margin: 15px 0 0 0; font-size: 14px; font-style: italic;">
                Thank you for respecting the silence.
              </p>
            </div>
            
            <div style="margin-top: 30px; padding: 20px; background: rgba(0, 0, 0, 0.3); border-radius: 8px;">
              <p style="color: rgba(255,255,255,0.7); margin: 0; font-size: 13px; line-height: 1.5;">
                <strong style="color: #00d4ff;">Security Notice:</strong><br>
                This communication is encrypted and logged with zero-knowledge protocols.<br>
                Your privacy is maintained throughout the entire support process.
              </p>
            </div>
          </div>
          
          <div style="margin-top: 40px; padding-top: 25px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
            <p style="color: rgba(255,255,255,0.6); font-size: 12px; margin: 0; line-height: 1.4;">
              — LedgerSwap Support Guardians<br>
              <span style="color: rgba(0, 212, 255, 0.8);">Secure • Private • Reliable</span>
            </p>
            <p style="color: rgba(255,255,255,0.4); font-size: 11px; margin: 15px 0 0 0;">
              This email was sent from the LedgerSwap Corridor. Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Corridor confirmation email sent successfully to:', email);
    return true;
  } catch (error) {
    console.error('Error sending corridor confirmation email:', error);
    return false;
  }
};
