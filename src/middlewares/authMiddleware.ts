import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';

/**
 * An authentication plugin for Elysia.
 * It verifies the JWT from the Authorization header and adds the user payload to the context.
 */
export const authMiddleware = (app: Elysia) =>
    app.use(
        jwt({
            name: 'jwt',
            secret: process.env.JWT_SECRET || 'your-secret-key',
            exp: '8h' // กำหนดให้ตรงกัน
        })
    )
    // .derive() adds a new property to the context for this and subsequent handlers.
    // We use it to add a `user` property containing the verified JWT payload.
    .derive(async ({ jwt, headers }) => {
        const auth = headers['authorization'];
        if (!auth || !auth.startsWith('Bearer ')) {
            return { user: null };
        }
        const token = auth.slice(7);
        // Use verify with ignoreExpiration to check the token even if it's expired
        const userPayload = await jwt.verify(token, {
            ignoreExpiration: true
        } as any);
        return {
            user: userPayload as { loginname: string; name: string } | null
        };
    })
    // .onBeforeHandle is a hook that runs before the main route handler.
    // We use it to protect routes by checking if a user is authenticated.
    .onBeforeHandle(async ({ user, set, jwt, headers }) => {
        // Now, we verify the token's expiration here.
        if (!user) {
            set.status = 401;
            return { success: false, message: 'Unauthorized' };
        }

        const auth = headers['authorization'];
        const token = auth!.slice(7);

        if (!(await jwt.verify(token))) {
            set.status = 401;
            return { success: false, message: 'Unauthorized' };
        }
    });