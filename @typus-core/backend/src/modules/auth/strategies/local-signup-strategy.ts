import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';

const prisma = global.prisma;
const logger = global.logger;

export const localSignupStrategy = new LocalStrategy(
    {
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true
    },
    async (req, email, password, done) => {
        try {
            const existingUser = await prisma.authUser.findUnique({
                where: { email }
            });

            if (existingUser) {
                return done(null, false, { message: 'Email already in use' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const user = await prisma.authUser.create({
                data: {
                    email,
                    password: hashedPassword,
                    isEmailVerified: false,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });

            return done(null, user);
        } catch (error) {
            logger.error('[Passport] Local signup strategy error', { error });
            return done(error);
        }
    }
);
