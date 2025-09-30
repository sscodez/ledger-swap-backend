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
      console.log('Google OAuth Strategy - Processing profile:', {
        id: profile.id,
        displayName: profile.displayName,
        email: profile.emails?.[0]?.value,
        photos: profile.photos?.length || 0
      });

      // Validate required profile data
      if (!profile.id) {
        console.error('Google OAuth: Missing profile ID');
        return done(new Error('Missing Google profile ID'), false);
      }

      if (!profile.emails || !profile.emails[0]?.value) {
        console.error('Google OAuth: Missing email in profile');
        return done(new Error('Missing email in Google profile'), false);
      }

      let user = await User.findOne({ googleId: profile.id });
      console.log('Existing user with Google ID found:', !!user);

      if (!user) {
        // Check if user exists with same email
        const existingUser = await User.findOne({ email: profile.emails[0].value });
        console.log('Existing user with email found:', !!existingUser);
        
        if (existingUser) {
          // Link Google account to existing user
          console.log('Linking Google account to existing user:', existingUser._id);
          existingUser.googleId = profile.id;
          if (!existingUser.profilePicture && profile.photos?.[0]?.value) {
            existingUser.profilePicture = profile.photos[0].value;
          }
          user = await existingUser.save();
          console.log('Successfully linked Google account');
        } else {
          // Create new user
          console.log('Creating new user with Google account');
          const userData = {
            googleId: profile.id,
            name: profile.displayName || 'Google User',
            email: profile.emails[0].value,
            profilePicture: profile.photos?.[0]?.value,
          };
          console.log('User data to create:', userData);
          
          user = await User.create(userData);
          console.log('Successfully created new user:', user._id);
        }
      } else {
        console.log('Using existing Google user:', user._id);
      }

      // Final validation
      if (!user || !user._id) {
        console.error('Google OAuth: User creation/retrieval failed');
        return done(new Error('Failed to create or retrieve user'), false);
      }

      console.log('Google OAuth Strategy Success - User ID:', user._id.toString());
      done(null, user);
    } catch (error) {
      console.error('Google OAuth Strategy Error:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name: error instanceof Error ? error.name : 'Unknown'
      });
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
