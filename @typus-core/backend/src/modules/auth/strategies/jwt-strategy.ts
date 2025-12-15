import { Strategy as JWTStrategy, ExtractJwt } from 'passport-jwt';

const prisma = global.prisma;
const logger = global.logger;


export const jwtStrategy = new JWTStrategy(
    {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: global.env.JWT_SECRET
    },
    async (jwtPayload, done) => {
        try {
            const user = await prisma.authUser.findUnique({
                where: { id: jwtPayload.id }
            });

            if (!user) {
                return done(null, false, { message: 'User not found' });
            }

            return done(null, user);
        } catch (error) {
            logger.error('[Passport] JWT strategy error', { error });
            return done(error);
        }
    }
);
