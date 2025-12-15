import passport from 'passport';
import { localStrategy } from './strategies/local-strategy';
import { jwtStrategy } from './strategies/jwt-strategy';
import { localSignupStrategy } from './strategies/local-signup-strategy';
import { resetPasswordStrategy } from './strategies/reset-password-strategy';
import { verifyEmailStrategy } from './strategies/verify-email-strategy';
import { googleStrategy } from './strategies/google-strategy';
import { Logger } from '../../core/logger/Logger.js';

const logger = new Logger();

// Register strategies
passport.use(localStrategy);
passport.use(jwtStrategy);
passport.use('local-signup', localSignupStrategy);
passport.use('reset-password', resetPasswordStrategy);
passport.use('verify-email', verifyEmailStrategy);

// Register Google strategy if configured
if (googleStrategy) {
    passport.use('google', googleStrategy);
    logger.info('[Passport] Google strategy registered');
} else {
    logger.warn('[Passport] Google strategy not registered - missing configuration');
}

export default passport;
