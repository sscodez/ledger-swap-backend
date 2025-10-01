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
exports.resetPassword = exports.forgotPassword = exports.facebookCallback = exports.googleCallback = exports.signin = exports.adminSignin = exports.signup = exports.debugOAuth = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const User_1 = __importDefault(require("../models/User"));
const Overview_1 = __importDefault(require("../models/Overview"));
const generateToken_1 = __importDefault(require("../utils/generateToken"));
const emailService_1 = require("../services/emailService");
// Debug endpoint to check OAuth configuration
const debugOAuth = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const config = {
            hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
            hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
            hasJwtSecret: !!process.env.JWT_SECRET,
            hasFrontendUrl: !!process.env.FRONTEND_URL,
            hasMongoUri: !!process.env.MONGO_URI,
            nodeEnv: process.env.NODE_ENV,
            googleClientIdLength: ((_a = process.env.GOOGLE_CLIENT_ID) === null || _a === void 0 ? void 0 : _a.length) || 0,
            googleClientSecretLength: ((_b = process.env.GOOGLE_CLIENT_SECRET) === null || _b === void 0 ? void 0 : _b.length) || 0,
        };
        // Test database connection
        let dbStatus = 'unknown';
        let userCount = 0;
        try {
            userCount = yield User_1.default.countDocuments();
            dbStatus = 'connected';
        }
        catch (dbError) {
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
    }
    catch (error) {
        res.status(500).json({
            message: 'Debug endpoint error',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});
exports.debugOAuth = debugOAuth;
const signup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, email, password } = req.body;
    try {
        const userExists = yield User_1.default.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const user = yield User_1.default.create({
            name,
            email,
            password,
        });
        if (user) {
            yield Overview_1.default.create({ user: user._id });
            const token = (0, generateToken_1.default)(String(user._id));
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token,
            });
        }
        else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    }
    catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
        else {
            res.status(500).json({ message: 'An unknown error occurred' });
        }
    }
});
exports.signup = signup;
const adminSignin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    try {
        const user = yield User_1.default.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        if (user.password && (yield bcryptjs_1.default.compare(password, user.password))) {
            const token = (0, generateToken_1.default)(String(user._id));
            return res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token,
                role: user.role,
            });
        }
        return res.status(401).json({ message: 'Invalid email or password' });
    }
    catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
        else {
            res.status(500).json({ message: 'An unknown error occurred' });
        }
    }
});
exports.adminSignin = adminSignin;
const signin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    try {
        const user = yield User_1.default.findOne({ email });
        if (user && user.password && (yield bcryptjs_1.default.compare(password, user.password))) {
            const token = (0, generateToken_1.default)(String(user._id));
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token,
            });
        }
        else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    }
    catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
        else {
            res.status(500).json({ message: 'An unknown error occurred' });
        }
    }
});
exports.signin = signin;
const googleCallback = (req, res) => {
    try {
        console.log('Google OAuth callback triggered');
        console.log('Request user:', req.user ? 'User exists' : 'No user');
        const user = req.user;
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
        const token = (0, generateToken_1.default)(user._id.toString());
        if (!token) {
            console.error('Google OAuth: Failed to generate token');
            return res.redirect(`https://ledgerswap.io/login?error=oauth_failed`);
        }
        console.log('Google OAuth success, redirecting with token');
        // Redirect to frontend with token
        res.redirect(`https://ledgerswap.io/?token=${token}`);
    }
    catch (error) {
        console.error('Google OAuth callback error:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        res.redirect(`https://ledgerswap.io/login?error=oauth_failed`);
    }
};
exports.googleCallback = googleCallback;
const facebookCallback = (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            console.error('Facebook OAuth: No user found in request');
            return res.redirect(`https://ledgerswap.io/login?error=oauth_failed`);
        }
        const token = (0, generateToken_1.default)(user._id.toString());
        const frontendUrl = process.env.FRONTEND_URL || 'https://ledgerswap.io';
        // Redirect to frontend with token
        res.redirect(`${frontendUrl}/?token=${token}`);
    }
    catch (error) {
        console.error('Facebook OAuth callback error:', error);
        res.redirect(`https://ledgerswap.io/login?error=oauth_failed`);
    }
};
exports.facebookCallback = facebookCallback;
// Forgot Password - Send reset email
const forgotPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        // Find user by email
        const user = yield User_1.default.findOne({ email: email.toLowerCase() });
        if (!user) {
            // Don't reveal if email exists or not for security
            return res.status(200).json({
                message: 'If an account with that email exists, a password reset link has been sent.'
            });
        }
        // Generate reset token
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        // Set token and expiration (1 hour)
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
        yield user.save();
        // Send email
        const emailSent = yield (0, emailService_1.sendPasswordResetEmail)(user.email, resetToken);
        if (!emailSent) {
            return res.status(500).json({ message: 'Error sending email. Please try again.' });
        }
        res.status(200).json({
            message: 'If an account with that email exists, a password reset link has been sent.'
        });
    }
    catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Server error. Please try again.' });
    }
});
exports.forgotPassword = forgotPassword;
// Reset Password - Update password with token
const resetPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            return res.status(400).json({ message: 'Token and new password are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }
        // Find user with valid reset token
        const user = yield User_1.default.findOne({
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
        yield user.save();
        // Send confirmation email
        yield (0, emailService_1.sendPasswordResetConfirmation)(user.email);
        res.status(200).json({ message: 'Password has been reset successfully' });
    }
    catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Server error. Please try again.' });
    }
});
exports.resetPassword = resetPassword;
