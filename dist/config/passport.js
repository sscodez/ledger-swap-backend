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
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const passport_facebook_1 = require("passport-facebook");
const User_1 = __importDefault(require("../models/User"));
// Get base URL from environment or use default
const getBaseUrl = () => {
    if (process.env.NODE_ENV === 'production') {
        return 'https://ledger-swap-backend.vercel.app';
    }
    return 'https://ledger-swap-backend.vercel.app';
};
const BASE_URL = getBaseUrl();
// Only configure Google OAuth if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    console.log('Configuring Google OAuth Strategy...');
    console.log('Google Client ID length:', process.env.GOOGLE_CLIENT_ID.length);
    console.log('Callback URL:', `${BASE_URL}/api/auth/google/callback`);
    passport_1.default.use(new passport_google_oauth20_1.Strategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${BASE_URL}/api/auth/google/callback`,
    }, (accessToken, refreshToken, profile, done) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        try {
            console.log('Google OAuth Strategy - Processing profile:', {
                id: profile.id,
                displayName: profile.displayName,
                email: (_b = (_a = profile.emails) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.value,
                photos: ((_c = profile.photos) === null || _c === void 0 ? void 0 : _c.length) || 0
            });
            // Validate required profile data
            if (!profile.id) {
                console.error('Google OAuth: Missing profile ID');
                return done(new Error('Missing Google profile ID'), false);
            }
            if (!profile.emails || !((_d = profile.emails[0]) === null || _d === void 0 ? void 0 : _d.value)) {
                console.error('Google OAuth: Missing email in profile');
                return done(new Error('Missing email in Google profile'), false);
            }
            let user = yield User_1.default.findOne({ googleId: profile.id });
            console.log('Existing user with Google ID found:', !!user);
            if (!user) {
                // Check if user exists with same email
                const existingUser = yield User_1.default.findOne({ email: profile.emails[0].value });
                console.log('Existing user with email found:', !!existingUser);
                if (existingUser) {
                    // Link Google account to existing user
                    console.log('Linking Google account to existing user:', existingUser._id);
                    existingUser.googleId = profile.id;
                    if (!existingUser.profilePicture && ((_f = (_e = profile.photos) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.value)) {
                        existingUser.profilePicture = profile.photos[0].value;
                    }
                    user = yield existingUser.save();
                    console.log('Successfully linked Google account');
                }
                else {
                    // Create new user
                    console.log('Creating new user with Google account');
                    const userData = {
                        googleId: profile.id,
                        name: profile.displayName || 'Google User',
                        email: profile.emails[0].value,
                        profilePicture: (_h = (_g = profile.photos) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.value,
                    };
                    console.log('User data to create:', userData);
                    user = yield User_1.default.create(userData);
                    console.log('Successfully created new user:', user._id);
                }
            }
            else {
                console.log('Using existing Google user:', user._id);
            }
            // Final validation
            if (!user || !user._id) {
                console.error('Google OAuth: User creation/retrieval failed');
                return done(new Error('Failed to create or retrieve user'), false);
            }
            console.log('Google OAuth Strategy Success - User ID:', user._id.toString());
            done(null, user);
        }
        catch (error) {
            console.error('Google OAuth Strategy Error:', error);
            console.error('Error details:', {
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : 'No stack trace',
                name: error instanceof Error ? error.name : 'Unknown'
            });
            done(error, false);
        }
    })));
}
else {
    console.warn('Google OAuth not configured - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
}
// Only configure Facebook OAuth if credentials are provided
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport_1.default.use(new passport_facebook_1.Strategy({
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: `${BASE_URL}/api/auth/facebook/callback`,
        profileFields: ['id', 'displayName', 'emails', 'picture.type(large)'],
    }, (accessToken, refreshToken, profile, done) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        try {
            let user = yield User_1.default.findOne({ facebookId: profile.id });
            if (!user) {
                user = yield User_1.default.create({
                    facebookId: profile.id,
                    name: profile.displayName,
                    email: (_a = profile.emails) === null || _a === void 0 ? void 0 : _a[0].value,
                    profilePicture: (_b = profile.photos) === null || _b === void 0 ? void 0 : _b[0].value,
                });
            }
            done(null, user);
        }
        catch (error) {
            done(error, false);
        }
    })));
}
else {
    console.warn('Facebook OAuth not configured - missing FACEBOOK_APP_ID or FACEBOOK_APP_SECRET');
}
passport_1.default.serializeUser((user, done) => {
    done(null, user.id);
});
passport_1.default.deserializeUser((id, done) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield User_1.default.findById(id);
        done(null, user);
    }
    catch (error) {
        done(error, false);
    }
}));
exports.default = passport_1.default;
