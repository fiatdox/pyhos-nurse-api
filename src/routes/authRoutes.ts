import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { login, loginCOREKON, refreshToken } from '../controllers/authController';

export const authRoutes = new Elysia({ prefix: '/api/v1' })
    // This route group also needs the JWT plugin to sign tokens
    .use(jwt({
        name: 'jwt',
        secret: process.env.JWT_SECRET || 'your-secret-key',
        exp: '8h' // ปรับอายุ Token เป็น 8 ชั่วโมง
    }))
    .guard({ detail: { tags: ['Auth'] } })
    .post('/login', login, {
        body: t.Object({
            username: t.String(),
            password: t.String()
        })
    })

    .post('/login/core-kon', loginCOREKON, {
        body: t.Object({
            username: t.String(),
            password: t.String()
        })
    })
    .post('/refresh', refreshToken);