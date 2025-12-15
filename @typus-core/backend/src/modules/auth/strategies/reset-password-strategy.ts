import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = global.prisma;
const logger = global.logger;


export const resetPasswordStrategy = new LocalStrategy(
    {
        usernameField: 'token',
        passwordField: 'password',
        passReqToCallback: true
    },
    async (req, token, password, done) => {
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

            const hashedPassword = await bcrypt.hash(password, 10);
            await prisma.authUser.update({
                where: { id: user.id },
                data: {
                    password: hashedPassword,
                    verificationToken: null,
                    updatedAt: new Date()
                }
            });

            return done(null, user);
        } catch (error) {
            logger.error('[Passport] Reset password strategy error', { error });
            return done(error);
        }
    }
);
