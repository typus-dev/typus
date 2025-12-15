import { Strategy as LocalStrategy } from 'passport-local';
import jwt from 'jsonwebtoken';

const prisma = global.prisma;
const logger = global.logger;


export const verifyEmailStrategy = new LocalStrategy(
    {
        usernameField: 'token',
        passwordField: 'token',
        passReqToCallback: true
    },
    async (req, token, _, done) => {
        try {
            const decoded = jwt.verify(token, global.env.JWT_SECRET ) as { email: string };
            const user = await prisma.authUser.findFirst({
                where: {
                    email: decoded.email,
                    verificationToken: token
                }
            });

            if (!user) {
                return done(null, false, { message: 'Invalid or expired token' });
            }

            await prisma.authUser.update({
                where: { id: user.id },
                data: {
                    isEmailVerified: true,
                    verificationToken: null
                }
            });

            return done(null, user);
        } catch (error) {
            logger.error('[Passport] Verify email strategy error', { error });
            return done(error);
        }
    }
);
