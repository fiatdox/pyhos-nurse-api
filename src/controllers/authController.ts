import { Context } from 'elysia';
import { hris, core_kon } from '../db';
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


export const loginCOREKON = async ({ body, set, jwt }: Context & { jwt: any }) => {
    const { username, password } = body as { username: string; password: string };

    try {
        const rows = await core_kon`
            SELECT id,username, password, id_card, CONCAT(pname, fname, ' ', lname) AS employee_name ,m."name" as mission_name,m1."name" as major_name,up.position_name
            FROM users u
            left join missions m on u.mission_id =m.mission_id
            left join majors m1 on u.major_id  =m1.major_id
            left join user_positions up on up.user_position_id =u.user_position_id
            WHERE username = ${username}
        `;

        if (rows.length === 0) {
            set.status = 401;
            return { success: false, message: 'Invalid username or password' };
        }

        const user = rows[0];
        const isMatch = await Bun.password.verify(password, user.password, 'argon2id');

        if (!isMatch) {
            set.status = 401;
            return { success: false, message: 'Invalid username or password' };
        }

        const token = await jwt.sign({ username: user.username });
        const weak = password === user.id_card;

        return {
            success: true,
            token,
            weak,
            data: {
                id : user.id,
                username: user.username,
                name: user.employee_name,
                mission_name: user.mission_name,
                major_name: user.major_name,
                position_name: user.position_name
            }
        };
    } catch (error) {
        console.error('Login error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};