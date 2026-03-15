import { Context } from 'elysia';
import { his } from '../db';
import { createHash } from 'crypto';
import { RowDataPacket } from 'mysql2';

export const login = async ({ body, set, jwt }: Context & { jwt: any }) => {
    const { username, password } = body as { username: string; password: string };

    // เข้ารหัส Password เป็น MD5 ตามที่ระบุ
    const hashedPassword = createHash('md5').update(password).digest('hex');

    try {
        const [rows] = await his.execute<RowDataPacket[]>(
            'SELECT loginname, name FROM opduser WHERE loginname = ? AND passweb = ?',
            [username, hashedPassword]
        );

        if (rows.length > 0) {
            const user = rows[0] as any;
            const token = await jwt.sign({
                loginname: user.loginname,
                name: user.name
            });

            return {
                success: true,
                token,
                data: user
            };
        }

        set.status = 401;
        return {
            success: false,
            message: 'Invalid username or password'
        };
    } catch (error) {
        console.error('Login error:', error);
        set.status = 500;
        return {
            success: false,
            message: 'Internal Server Error'
        };
    }
};

export const refreshToken = async ({ jwt, headers, set }: Context & { jwt: any }) => {
    const auth = headers['authorization'];

    if (!auth || !auth.startsWith('Bearer ')) {
        set.status = 400;
        return { success: false, message: 'Refresh token is required.' };
    }

    const token = auth.slice(7);
    const payload = await jwt.verify(token, { ignoreExpiration: true });

    if (!payload) {
        set.status = 401;
        return { success: false, message: 'Invalid refresh token.' };
    }

    // สร้าง Token ใหม่จากข้อมูลเดิม
    const newToken = await jwt.sign({
        loginname: payload.loginname,
        name: payload.name
    });

    return { success: true, token: newToken };
};