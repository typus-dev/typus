import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';

const prisma = global.prisma;
const logger = global.logger;


export const localStrategy = new LocalStrategy(
    {
        usernameField: 'email',
        passwordField: 'password'
    },
    async (email, password, done) => {
        try {
            const user = await prisma.authUser.findUnique({
                where: { email }
            });

            if (!user) {
                return done(null, false, { message: 'Invalid credentials' });
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return done(null, false, { message: 'Invalid credentials' });
            }

            return done(null, user);
        } catch (error) {
            logger.error('[Passport] Local strategy error', { error });
            return done(error);
        }
    }
);
