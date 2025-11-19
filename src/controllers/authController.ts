import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User';
import Overview from '../models/Overview';
import generateToken from '../utils/generateToken';
import { sendPasswordResetEmail, sendPasswordResetConfirmation, generateVerificationCode } from '../services/emailService';

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

    const user = await User.create({
      name,
      email,
      password,
    });

    if (user) {
      await Overview.create({ user: user._id });
      const token = generateToken(String(user._id));
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token,
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
      const token = generateToken(String(user._id));
      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token,
        role: user.role,
      });
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
      const token = generateToken(String(user._id));
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token,
      });
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
