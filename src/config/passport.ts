import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import User from '../models/User';

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
  
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${BASE_URL}/api/auth/google/callback`,
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('Google OAuth Profile:', {
        id: profile.id,
        displayName: profile.displayName,
        email: profile.emails?.[0]?.value
      });

      let user = await User.findOne({ googleId: profile.id });

      if (!user) {
        // Check if user exists with same email
        const existingUser = await User.findOne({ email: profile.emails?.[0]?.value });
        
        if (existingUser) {
          // Link Google account to existing user
          existingUser.googleId = profile.id;
          if (!existingUser.profilePicture && profile.photos?.[0]?.value) {
            existingUser.profilePicture = profile.photos[0].value;
          }
          user = await existingUser.save();
        } else {
          // Create new user
          user = await User.create({
            googleId: profile.id,
            name: profile.displayName || 'Google User',
            email: profile.emails?.[0]?.value || '',
            profilePicture: profile.photos?.[0]?.value,
          });
        }
      }

      console.log('Google OAuth Success - User:', user._id);
      done(null, user);
    } catch (error) {
      console.error('Google OAuth Strategy Error:', error);
      done(error, false);
    }
  }));
} else {
  console.warn('Google OAuth not configured - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
}

// Only configure Facebook OAuth if credentials are provided
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: `${BASE_URL}/api/auth/facebook/callback`,
    profileFields: ['id', 'displayName', 'emails', 'picture.type(large)'],
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ facebookId: profile.id });

      if (!user) {
        user = await User.create({
          facebookId: profile.id,
          name: profile.displayName,
          email: profile.emails?.[0].value,
          profilePicture: profile.photos?.[0].value,
        });
      }

      done(null, user);
    } catch (error) {
      done(error, false);
    }
  }));
} else {
  console.warn('Facebook OAuth not configured - missing FACEBOOK_APP_ID or FACEBOOK_APP_SECRET');
}

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, false);
  }
});

export default passport;
