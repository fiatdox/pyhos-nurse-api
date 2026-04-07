import { Context } from 'elysia';
import { hris } from '../db';
import bcrypt from 'bcryptjs';
import { RowDataPacket } from 'mysql2';

export const login = async ({ body, set, jwt }: Context & { jwt: any }) => {
    const { username, password } = body as { username: string; password: string };

    try {
        const [rows] = await hris.execute<RowDataPacket[]>(
            `SELECT id, username, password, CONCAT(pname, fname, ' ', lname) AS employee_name FROM users WHERE username = ?`,
            [username]
        );

        if (rows.length > 0) {
            const user = rows[0] as any;
            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                set.status = 401;
                return { success: false, message: 'Invalid username or password' };
            }

            const token = await jwt.sign({
                id: user.id,
                username: user.username,
                name: user.employee_name
            });

            return {
                success: true,
                token,
                data: {
                    id: user.id,
                    username: user.username,
                    name: user.employee_name
                }
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