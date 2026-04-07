import { Context } from 'elysia';
import { nurse } from '../db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { sanitizeHTML } from '../utils/sanitize';

// ดึงรายชื่อเจ้าหน้าที่ทั้งหมด (กรองตาม is_active ได้)
export const getStaffs = async ({ query, set }: Context) => {
    const { is_active } = query as { is_active?: string };

    try {
        let sql = `
            SELECT staff_id, fullname, staff_position_id, is_active
            FROM staffs
        `;
        const params: any[] = [];

        if (is_active !== undefined) {
            sql += ` WHERE is_active = ?`;
            params.push(is_active);
        }

        sql += ` ORDER BY fullname ASC`;

        const [rows] = await nurse.execute<RowDataPacket[]>(sql, params);

        return {
            success: true,
            data: rows.map(row => ({
                ...row,
                fullname: row.fullname ? sanitizeHTML(row.fullname) : null
            }))
        };
    } catch (error) {
        console.error('Get staffs error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

// เพิ่มเจ้าหน้าที่ใหม่
export const addStaff = async ({ body, set }: Context) => {
    const { fullname, staff_position_id, is_active } = body as {
        fullname: string;
        staff_position_id: number;
        is_active?: string;
    };

    if (!fullname || !staff_position_id) {
        set.status = 400;
        return { success: false, message: 'กรุณาระบุ fullname และ staff_position_id' };
    }

    try {
        const [result] = await nurse.execute<ResultSetHeader>(
            `INSERT INTO staffs (fullname, staff_position_id, is_active) VALUES (?, ?, ?)`,
            [fullname, staff_position_id, is_active ?? 'Y']
        );

        return {
            success: true,
            message: 'เพิ่มเจ้าหน้าที่เรียบร้อยแล้ว',
            staff_id: result.insertId
        };
    } catch (error) {
        console.error('Add staff error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

// แก้ไขข้อมูลเจ้าหน้าที่
export const updateStaff = async ({ params, body, set }: Context) => {
    const staff_id = Number(params.id);
    const { fullname, staff_position_id, is_active } = body as { fullname?: string; staff_position_id?: number; is_active?: string };

    if (!fullname && staff_position_id === undefined && is_active === undefined) {
        set.status = 400;
        return { success: false, message: 'กรุณาระบุข้อมูลที่ต้องการแก้ไขอย่างน้อย 1 ฟิลด์' };
    }

    try {
        const [existing] = await nurse.execute<RowDataPacket[]>(
            `SELECT staff_id FROM staffs WHERE staff_id = ?`,
            [staff_id]
        );

        if ((existing as RowDataPacket[]).length === 0) {
            set.status = 404;
            return { success: false, message: 'ไม่พบเจ้าหน้าที่ที่ต้องการแก้ไข' };
        }

        const fields: string[] = [];
        const values: any[] = [];

        if (fullname !== undefined) { fields.push('fullname = ?'); values.push(fullname); }
        if (staff_position_id !== undefined) { fields.push('staff_position_id = ?'); values.push(staff_position_id); }
        if (is_active !== undefined) { fields.push('is_active = ?'); values.push(is_active); }

        values.push(staff_id);

        await nurse.execute(
            `UPDATE staffs SET ${fields.join(', ')} WHERE staff_id = ?`,
            values
        );

        return { success: true, message: 'แก้ไขข้อมูลเจ้าหน้าที่เรียบร้อยแล้ว' };
    } catch (error) {
        console.error('Update staff error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

// ปิดการแสดง (ตั้ง is_active = 'N')
export const deactivateStaff = async ({ params, set }: Context) => {
    const staff_id = Number(params.id);

    try {
        const [existing] = await nurse.execute<RowDataPacket[]>(
            `SELECT staff_id FROM staffs WHERE staff_id = ?`,
            [staff_id]
        );

        if ((existing as RowDataPacket[]).length === 0) {
            set.status = 404;
            return { success: false, message: 'ไม่พบเจ้าหน้าที่' };
        }

        await nurse.execute(
            `UPDATE staffs SET is_active = 'N' WHERE staff_id = ?`,
            [staff_id]
        );

        return { success: true, message: 'ปิดการแสดงเจ้าหน้าที่เรียบร้อยแล้ว' };
    } catch (error) {
        console.error('Deactivate staff error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

// เปิดการแสดง (ตั้ง is_active = 'Y')
export const activateStaff = async ({ params, set }: Context) => {
    const staff_id = Number(params.id);

    try {
        const [existing] = await nurse.execute<RowDataPacket[]>(
            `SELECT staff_id FROM staffs WHERE staff_id = ?`,
            [staff_id]
        );

        if ((existing as RowDataPacket[]).length === 0) {
            set.status = 404;
            return { success: false, message: 'ไม่พบเจ้าหน้าที่' };
        }

        await nurse.execute(
            `UPDATE staffs SET is_active = 'Y' WHERE staff_id = ?`,
            [staff_id]
        );

        return { success: true, message: 'เปิดการแสดงเจ้าหน้าที่เรียบร้อยแล้ว' };
    } catch (error) {
        console.error('Activate staff error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};
