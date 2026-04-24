import { Elysia } from 'elysia';
import { authMiddleware } from '../middlewares/authMiddleware';

export const protectedRoutes = new Elysia({ prefix: '/api/v1' })
    // Apply the authentication middleware to all routes in this group.
    // The `onBeforeHandle` inside the middleware will protect them.
    .use(authMiddleware)
    .guard({ detail: { tags: ['Auth'] } })
    .get('/profile', ({ user, set }) => {
        // The `user` object is now directly available from the context,
        // thanks to the `.derive()` in our middleware.
        return {
            success: true,
            data: user
        };
    });