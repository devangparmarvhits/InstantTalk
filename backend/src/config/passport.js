const passport = require('passport');
const crypto = require('crypto');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const User = require('../models/User');
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } = require('./env');

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const googleId = profile.id;
          const email = profile.emails?.[0]?.value || `${googleId}@google.local`;
          const name = profile.displayName || email.split('@')[0];
          const avatar = profile.photos?.[0]?.value || '';

          let user = await User.findOne({ googleId });

          if (!user) {
            user = await User.findOne({ email });
            if (user) {
              user.googleId = googleId;
              user.provider = 'google';
              user.emailVerified = true;
              if (!user.avatar) user.avatar = avatar;
              await user.save();
            } else {
              user = await User.create({
                name,
                email,
                password: crypto.randomBytes(16).toString('hex'),
                avatar,
                googleId,
                provider: 'google',
                emailVerified: true,
              });
            }
          }

          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
}

module.exports = passport;