import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

const prisma = global.prisma;
const logger = global.logger;

// Google OAuth strategy using runtime config (loaded from database)
// Fallback to .env if database config is not available
export const googleStrategy = global.runtimeConfig.googleClientId && global.runtimeConfig.googleClientSecret ?
    new GoogleStrategy(
        {
            clientID: global.runtimeConfig.googleClientId,
            clientSecret: global.runtimeConfig.googleClientSecret,
            callbackURL: global.runtimeConfig.googleCallbackUrl
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails?.[0]?.value;

                if (!email) {
                    return done(null, false, { message: 'Email not provided by Google' });
                }

                let user = await prisma.authUser.findUnique({
                    where: { email }
                });

                if (!user) {
                    user = await prisma.authUser.create({
                        data: {
                            email,
                            userName: profile.displayName || '',
                            isEmailVerified: true,
                            password: '', // Password can be empty for Google OAuth
                            googleId: profile.id,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }
                    });
                } else if (!user.googleId) {
                    user = await prisma.authUser.update({
                        where: { id: user.id },
                        data: { 
                            googleId: profile.id,
                            updatedAt: new Date() 
                        }
                    });
                }

                return done(null, user);
            } catch (error) {
                logger.error('[Passport] Google strategy error', { error });
                return done(error);
            }
        }
    ) : null;
