import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import QRCode from 'qrcode';
import speakeasy from 'speakeasy';
import User, { IUser } from '../models/User';
import Overview from '../models/Overview';
import generateToken from '../utils/generateToken';
import { AuthRequest } from '../middleware/authMiddleware';
import { sendPasswordResetEmail, sendPasswordResetConfirmation, generateVerificationCode, sendEmailVerification, sendWelcomeEmail, generateEmailVerificationToken } from '../services/emailService';

const TWO_FACTOR_LOGIN_EXPIRATION_MINUTES = 10;

const buildUserPayload = (user: IUser) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  emailVerified: user.emailVerified,
  role: user.role,
  twoFactorEnabled: !!user.twoFactorEnabled,
});

const respondWithAuthSuccess = (user: IUser, res: Response) => {
  const token = generateToken(String(user._id));
  res.json({
    ...buildUserPayload(user),
    token,
  });
};

const triggerTwoFactorChallenge = async (user: IUser, res: Response) => {
  if (!user.twoFactorSecret) {
    return respondWithAuthSuccess(user, res);
  }

  user.twoFactorLoginToken = crypto.randomBytes(24).toString('hex');
  user.twoFactorLoginExpires = new Date(Date.now() + TWO_FACTOR_LOGIN_EXPIRATION_MINUTES * 60 * 1000);
  await user.save();

  res.json({
    requiresTwoFactor: true,
    loginToken: user.twoFactorLoginToken,
    expiresIn: TWO_FACTOR_LOGIN_EXPIRATION_MINUTES,
    message: 'Two-factor authentication required to finish signing in.',
  });
};

export const startTwoFactorSetup = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user?._id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const user = await User.findById(authReq.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({ message: 'Two-factor authentication is already enabled.' });
    }

    const secret = speakeasy.generateSecret({ length: 32, name: `LedgerSwap (${user.email})` });
    user.twoFactorTempSecret = secret.base32;
    await user.save();

    const qrCode = secret.otpauth_url ? await QRCode.toDataURL(secret.otpauth_url) : null;

    res.json({
      qrCode,
      otpauthUrl: secret.otpauth_url,
      secret: secret.base32,
    });
  } catch (error) {
    console.error('startTwoFactorSetup error:', error);
    res.status(500).json({ message: 'Failed to start two-factor setup' });
  }
};

export const verifyTwoFactorSetup = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user?._id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ message: 'A valid 6-digit code is required.' });
    }

    const user = await User.findById(authReq.user._id);
    if (!user || !user.twoFactorTempSecret) {
      return res.status(400).json({ message: 'Two-factor setup was not initiated.' });
    }

    const cleanedToken = token.replace(/\s+/g, '');
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorTempSecret,
      token: cleanedToken,
      encoding: 'base32',
      window: 1,
    });

    if (!verified) {
      return res.status(400).json({ message: 'Invalid authentication code. Please try again.' });
    }

    user.twoFactorSecret = user.twoFactorTempSecret;
    user.twoFactorTempSecret = undefined;
    user.twoFactorEnabled = true;
    user.twoFactorEnabledAt = new Date();
    await user.save();

    res.json({ message: 'Two-factor authentication enabled successfully.' });
  } catch (error) {
    console.error('verifyTwoFactorSetup error:', error);
    res.status(500).json({ message: 'Failed to verify two-factor setup.' });
  }
};

export const disableTwoFactor = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user?._id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ message: 'A valid 6-digit code is required.' });
    }

    const user = await User.findById(authReq.user._id);
    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ message: 'Two-factor authentication is not enabled.' });
    }

    const cleanedToken = token.replace(/\s+/g, '');
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      token: cleanedToken,
      encoding: 'base32',
      window: 1,
    });

    if (!verified) {
      return res.status(400).json({ message: 'Invalid authentication code. Please try again.' });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorTempSecret = undefined;
    user.twoFactorEnabledAt = undefined;
    user.twoFactorLoginToken = undefined;
    user.twoFactorLoginExpires = undefined;
    await user.save();

    res.json({ message: 'Two-factor authentication disabled.' });
  } catch (error) {
    console.error('disableTwoFactor error:', error);
    res.status(500).json({ message: 'Failed to disable two-factor authentication.' });
  }
};

export const verifyTwoFactorLogin = async (req: Request, res: Response) => {
  try {
    const { loginToken, code } = req.body;
    if (!loginToken || !code) {
      return res.status(400).json({ message: 'Login token and authentication code are required.' });
    }

    const user = await User.findOne({
      twoFactorLoginToken: loginToken,
      twoFactorLoginExpires: { $gt: new Date() },
    });

    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ message: 'Invalid or expired login token.' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      token: String(code).replace(/\s+/g, ''),
      encoding: 'base32',
      window: 1,
    });

    if (!verified) {
      return res.status(400).json({ message: 'Invalid authentication code. Please try again.' });
    }

    user.twoFactorLoginToken = undefined;
    user.twoFactorLoginExpires = undefined;
    await user.save();

    respondWithAuthSuccess(user, res);
  } catch (error) {
    console.error('verifyTwoFactorLogin error:', error);
    res.status(500).json({ message: 'Failed to verify authentication code. Please try again.' });
  }
};

// Debug endpoint to check OAuth configuration
export const debugOAuth = async (req: Request, res: Response) => {
  try {
    const config = {
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasFrontendUrl: !!process.env.FRONTEND_URL,
      hasMongoUri: !!process.env.MONGO_URI,
      nodeEnv: process.env.NODE_ENV,
      googleClientIdLength: process.env.GOOGLE_CLIENT_ID?.length || 0,
      googleClientSecretLength: process.env.GOOGLE_CLIENT_SECRET?.length || 0,
    };

    // Test database connection
    let dbStatus = 'unknown';
    let userCount = 0;
    try {
      userCount = await User.countDocuments();
      dbStatus = 'connected';
    } catch (dbError) {
      dbStatus = `error: ${dbError instanceof Error ? dbError.message : 'Unknown DB error'}`;
    }
    
    res.json({
      message: 'OAuth Configuration Debug',
      config,
      database: {
        status: dbStatus,
        userCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      message: 'Debug endpoint error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
};

export const signup = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Generate email verification token
    const emailVerificationToken = generateEmailVerificationToken();
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await User.create({
      name,
      email,
      password,
      emailVerified: false,
      emailVerificationToken,
      emailVerificationExpires,
    });

    if (user) {
      await Overview.create({ user: user._id });
      
      // Send verification email
      const emailSent = await sendEmailVerification(user.email, emailVerificationToken);
      
      if (!emailSent) {
        console.warn('Failed to send verification email to:', user.email);
      }

      // Return success response without token (user needs to verify email first)
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        emailVerified: false,
        message: 'Account created successfully. Please check your email to verify your account.',
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred' });
    }
  }
};

export const adminSignin = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    if (user.password && (await bcrypt.compare(password, user.password))) {
      if (user.twoFactorEnabled && user.twoFactorSecret) {
        return triggerTwoFactorChallenge(user, res);
      }
      return respondWithAuthSuccess(user, res);
    }

    return res.status(401).json({ message: 'Invalid email or password' });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred' });
    }
  }
};

export const signin = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && user.password && (await bcrypt.compare(password, user.password))) {
      // Check if email is verified (only for non-OAuth users)
      if (!user.googleId && !user.facebookId && !user.emailVerified) {
        return res.status(403).json({ 
          message: 'Please verify your email address before signing in. Check your inbox for the verification link.',
          emailVerified: false,
          userId: user._id
        });
      }

      if (user.twoFactorEnabled && user.twoFactorSecret) {
        return triggerTwoFactorChallenge(user, res);
      }

      return respondWithAuthSuccess(user, res);
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred' });
    }
  }
};

export const googleCallback = (req: Request, res: Response) => {
  try {
    console.log('Google OAuth callback triggered');
    console.log('Request user:', req.user ? 'User exists' : 'No user');
    
    const user = req.user as any;
    
    if (!user) {
      console.error('Google OAuth: No user found in request');
      console.error('Request query:', req.query);
      console.error('Request headers:', req.headers);
      return res.redirect(`https://ledgerswap.io/login?error=oauth_failed`);
    }

    // Validate user has required fields
    if (!user._id) {
      console.error('Google OAuth: User missing _id field', user);
      return res.redirect(`https://ledgerswap.io/login?error=oauth_failed`);
    }

    console.log('Generating token for user:', user._id.toString());
    const token = generateToken(user._id.toString());
    
    if (!token) {
      console.error('Google OAuth: Failed to generate token');
      return res.redirect(`https://ledgerswap.io/login?error=oauth_failed`);
    }

    console.log('Google OAuth success, redirecting with token');
    // Redirect to frontend with token
    res.redirect(`https://ledgerswap.io/?token=${token}`);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.redirect(`https://ledgerswap.io/login?error=oauth_failed`);
  }
};

export const facebookCallback = (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    
    if (!user) {
      console.error('Facebook OAuth: No user found in request');
      return res.redirect(`https://ledgerswap.io/login?error=oauth_failed`);
    }

    const token = generateToken(user._id.toString());
    const frontendUrl = process.env.FRONTEND_URL || 'https://ledgerswap.io';
    
    // Redirect to frontend with token
    res.redirect(`${frontendUrl}/?token=${token}`);
  } catch (error) {
    console.error('Facebook OAuth callback error:', error);
    res.redirect(`https://ledgerswap.io/login?error=oauth_failed`);
  }
};

// Forgot Password - Send reset email with verification code
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.status(200).json({ 
        message: 'If an account with that email exists, a password reset code has been sent.' 
      });
    }

    // Generate 6-digit verification code
    const resetCode = generateVerificationCode();
    
    // Set code and expiration (15 minutes)
    user.resetPasswordCode = resetCode;
    user.resetPasswordCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    await user.save();

    // Send email with verification code
    const emailSent = await sendPasswordResetEmail(user.email, resetCode);
    
    if (!emailSent) {
      return res.status(500).json({ message: 'Error sending email. Please try again.' });
    }

    res.status(200).json({ 
      message: 'If an account with that email exists, a password reset code has been sent.',
      codeExpires: 15 // minutes
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// Verify Reset Code - Verify the 6-digit code
export const verifyResetCode = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: 'Email and verification code are required' });
    }

    // Find user with valid reset code
    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordCode: code,
      resetPasswordCodeExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    // Generate a temporary token for password reset (valid for 10 minutes)
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Clear the verification code
    user.resetPasswordCode = undefined;
    user.resetPasswordCodeExpires = undefined;
    
    await user.save();

    res.status(200).json({ 
      message: 'Verification code confirmed',
      resetToken,
      tokenExpires: 10 // minutes
    });
  } catch (error) {
    console.error('Verify reset code error:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// Reset Password - Update password with token
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Update password
    user.password = password; // Will be hashed by pre-save middleware
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.resetPasswordCode = undefined;
    user.resetPasswordCodeExpires = undefined;
    
    await user.save();

    // Send confirmation email
    await sendPasswordResetConfirmation(user.email);

    res.status(200).json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user?._id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new passwords are required' });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    const user = await User.findById(authReq.user._id).select('+password');
    if (!user || !user.password) {
      return res.status(400).json({ message: 'Password change is unavailable for this account' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('changePassword error:', error);
    res.status(500).json({ message: 'Failed to update password. Please try again.' });
  }
};

// Verify Email - Verify email address with token
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' });
    }

    // Find user with valid verification token
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    // Update user as verified
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    
    await user.save();

    // Send welcome email
    await sendWelcomeEmail(user.email, user.name);

    // Generate token for automatic login
    const authToken = generateToken(String(user._id));

    res.status(200).json({ 
      message: 'Email verified successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        emailVerified: true,
      },
      token: authToken
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// Resend Email Verification - Send new verification email
export const resendEmailVerification = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.status(200).json({ 
        message: 'If an account with that email exists and is not verified, a new verification email has been sent.' 
      });
    }

    // Check if already verified
    if (user.emailVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    // Check if user is OAuth user
    if (user.googleId || user.facebookId) {
      return res.status(400).json({ message: 'OAuth accounts do not require email verification' });
    }

    // Generate new verification token
    const emailVerificationToken = generateEmailVerificationToken();
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationExpires = emailVerificationExpires;
    
    await user.save();

    // Send verification email
    const emailSent = await sendEmailVerification(user.email, emailVerificationToken);
    
    if (!emailSent) {
      return res.status(500).json({ message: 'Error sending email. Please try again.' });
    }

    res.status(200).json({ 
      message: 'If an account with that email exists and is not verified, a new verification email has been sent.',
      tokenExpires: 24 // hours
    });
  } catch (error) {
    console.error('Resend email verification error:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};
