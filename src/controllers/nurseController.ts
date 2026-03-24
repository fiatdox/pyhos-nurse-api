import { Context } from 'elysia';
import { his,nurse } from '../db';
import { RowDataPacket } from 'mysql2';
import { sanitizeHTML } from '../utils/sanitize';

//ฟังก์ชั่นบันทึกตารางพยาบาลและเจ้าหน้าที่
export const addNurseSchedule = async ({ body, set }: Context) => {
    // กำหนดให้ body เป็น Array ของตารางการทำงาน
    const schedules = body as any[];

    if (!Array.isArray(schedules) || schedules.length === 0) {
        set.status = 400;
        return {
            success: false,
            message: 'ไม่พบข้อมูลตารางการทำงานที่ต้องการบันทึก'
        };
    }

    const connection = await nurse.getConnection();

    try {
        await connection.beginTransaction();

        // 1. กำหนดขอบเขต (Scope) เพื่อลบข้อมูลที่ "ไม่ได้ส่งมา" 
        // โดยเช็คเฉพาะจาก ward และ shift_date ที่มีปรากฏใน payload เท่านั้น
        const scopeTuples: { shift_date: string, ward: string }[] = [];
        const scopeSet = new Set<string>();
        for (const s of schedules) {
            const key = `${s.shift_date}_${s.ward}`;
            if (!scopeSet.has(key)) {
                scopeSet.add(key);
                scopeTuples.push({ shift_date: s.shift_date, ward: s.ward });
            }
        }

        if (scopeTuples.length > 0) {
            const scopePlaceholders = scopeTuples.map(() => `(?, ?)`).join(', ');
            const tuplePlaceholders = schedules.map(() => `(?, ?, ?, ?)`).join(', ');

            const deleteParams = [
                ...scopeTuples.flatMap(t => [t.shift_date, t.ward]),
                ...schedules.flatMap(s => [s.staff_id, s.shift_date, s.shift_code, s.ward])
            ];

            const deleteSql = `
                DELETE FROM shift_assignments 
                WHERE (shift_date, ward) IN (${scopePlaceholders})
                  AND (staff_id, shift_date, shift_code, ward) NOT IN (${tuplePlaceholders})
            `;
            
            await connection.query(deleteSql, deleteParams);
        }

        // 2. ทำการเพิ่มใหม่ หรือ อัพเดทข้อมูลที่ส่งมา (Upsert)
        // การใช้ ON DUPLICATE KEY UPDATE จะช่วยให้สามารถอัพเดทข้อมูลได้หากมีข้อมูลซ้ำ
        // **สิ่งสำคัญ:** ต้องมีการสร้าง Unique Key (staff_id, shift_date, shift_code, ward) ในตาราง shift_assignments
        const sql = `
            INSERT INTO shift_assignments (
                staff_id,
                shift_date,
                shift_code,
                ward,
                created_at,
                created_by
            ) VALUES ?
            ON DUPLICATE KEY UPDATE
                updated_at = NOW(),
                updated_by = VALUES(created_by)
        `;

        const values = schedules.map(s => [
            s.staff_id,
            s.shift_date,
            s.shift_code,
            s.ward,
            new Date(),
            s.created_by || s.updated_by || null
        ]);

        await connection.query(sql, [values]);

        await connection.commit();

        return {
            success: true,
            message: `บันทึกและปรับปรุงตารางการทำงานเรียบร้อยแล้ว จำนวน ${schedules.length} รายการ`
        };
    } catch (error) {
        await connection.rollback();
        console.error('Error saving nurse schedule:', error);
        set.status = 500;
        return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
            error: String(error)
        };
    } finally {
        connection.release();
    }
};

// ฟังก์ชันสำหรับดึงข้อมูลตารางเวรตาม ward, shift_date และ staff_id
export const getNurseScheduleDetail = async ({ body, set }: Context) => {
    const { ward, shift_date, staff_id, shift_code } = body as { ward: string, shift_date: string, staff_id: number, shift_code?: string };

    if (!ward || !shift_date || !staff_id) {
        set.status = 400;
        return {
            success: false,
            message: 'กรุณาระบุ ward, shift_date และ staff_id ให้ครบถ้วน'
        };
    }

    try {
        let sql = `
            SELECT 
                sa.shift_assignment_id,
                sa.staff_id,
                s.fullname,
                sa.shift_date,
                sa.shift_code,
                sa.ward,
                sa.created_at,
                sa.created_by,
                sa.updated_at,
                sa.updated_by
            FROM shift_assignments sa
            LEFT JOIN staffs s ON sa.staff_id = s.staff_id
            WHERE sa.ward = ? AND sa.shift_date = ? AND sa.staff_id = ?
        `;

        const queryParams: any[] = [ward, shift_date, staff_id];
        
        // หากส่ง shift_code เข้ามาด้วย ให้กรองเฉพาะเวรนั้น
        if (shift_code) {
            sql += ` AND sa.shift_code = ?`;
            queryParams.push(shift_code);
        }

        const [rows] = await nurse.execute<RowDataPacket[]>(sql, queryParams);

        return {
            success: true,
            data: rows.map(row => ({
                ...row,
                fullname: row.fullname ? sanitizeHTML(row.fullname) : null
            }))
        };
    } catch (error) {
        console.error('Get nurse schedule detail error:', error);
        set.status = 500;
        return {
            success: false,
            message: 'Internal Server Error'
        };
    }
};

// ฟังก์ชันสำหรับลบตารางเวรบางรายการ (รับ id เป็น Array)
export const deleteNurseSchedule = async ({ body, set }: Context) => {
    const schedules = body as any[];

    if (!Array.isArray(schedules) || schedules.length === 0) {
        set.status = 400;
        return {
            success: false,
            message: 'ไม่พบรายการที่ต้องการลบ'
        };
    }

    const connection = await nurse.getConnection();

    try {
        await connection.beginTransaction();

        // รองรับทั้งการส่ง Array ของ Object [{ shift_assignment_id: 1 }] หรือ Array ของ Number [1, 2]
        const values = schedules.map(s => typeof s === 'object' ? s.shift_assignment_id : s);
        const sql = `DELETE FROM shift_assignments WHERE shift_assignment_id IN (?)`;

        const [result] = await connection.query(sql, [values]);

        await connection.commit();

        return {
            success: true,
            message: `ลบตารางเวรเรียบร้อยแล้ว จำนวน ${(result as any).affectedRows} รายการ`
        };
    } catch (error) {
        await connection.rollback();
        console.error('Delete nurse schedule error:', error);
        set.status = 500;
        return {
            success: false,
            message: 'Internal Server Error'
        };
    } finally {
        connection.release();
    }
};

// ฟังก์ชันสำหรับดึงข้อมูลตารางเวรของพยาบาลตาม ward และเดือน
export const getNurseSchedule = async ({ query, set }: Context) => {
    // รับค่า ward และ month ผ่าน Query String (เช่น ?ward=00&month=2026-03)
    const { ward, month } = query as Record<string, string>;

    if (!ward || !month) {
        set.status = 400;
        return {
            success: false,
            message: 'กรุณาระบุ ward และ month (รูปแบบ YYYY-MM เช่น 2026-03)'
        };
    }

    try {
        const sql = `
            SELECT 
                sa.shift_assignment_id,
                sa.staff_id,
                s.fullname,
                sa.shift_date,
                sa.shift_code,
                sa.ward
            FROM shift_assignments sa
            LEFT JOIN staffs s ON sa.staff_id = s.staff_id
            WHERE sa.ward = ? AND DATE_FORMAT(sa.shift_date, '%Y-%m') = ?
            ORDER BY sa.shift_date ASC, sa.staff_id ASC
        `;
        const [rows] = await nurse.execute<RowDataPacket[]>(sql, [ward, month]);

        return {
            success: true,
            data: rows.map(row => ({
                ...row,
                fullname: row.fullname ? sanitizeHTML(row.fullname) : null
            }))
        };
    } catch (error) {
        console.error('Get nurse schedule error:', error);
        set.status = 500;
        return {
            success: false,
            message: 'Internal Server Error'
        };
    }
};

// ฟังก์ชันสำหรับดึงข้อมูลตารางเวรตาม ward และ date (รองรับทั้ง YYYY-MM และ YYYY-MM-DD)
export const getNurseScheduleByDate = async ({ body, set }: Context) => {
    const { ward, date } = body as { ward: string, date: string };

    if (!ward || !date) {
        set.status = 400;
        return {
            success: false,
            message: 'กรุณาระบุ ward และ date'
        };
    }

    try {
        // ตรวจสอบว่าส่งมาแค่เดือน (ยาว 7 ตัว เช่น 2026-03) หรือส่งมาเต็มวัน (ยาว 10 ตัว เช่น 2026-03-01)
        const isMonthOnly = date.length === 7;
        const dateCondition = isMonthOnly ? `DATE_FORMAT(sa.shift_date, '%Y-%m') = ?` : `sa.shift_date = ?`;

        const sql = `
            SELECT 
                sa.shift_assignment_id,
                sa.staff_id,
                s.fullname,
                sa.shift_date,
                sa.shift_code,
                sa.ward
            FROM shift_assignments sa
            LEFT JOIN staffs s ON sa.staff_id = s.staff_id
            WHERE sa.ward = ? AND ${dateCondition}
            ORDER BY sa.shift_date ASC, sa.shift_code ASC, sa.staff_id ASC
        `;

        const [rows] = await nurse.execute<RowDataPacket[]>(sql, [ward, date]);

        return {
            success: true,
            data: rows.map(row => ({
                ...row,
                fullname: row.fullname ? sanitizeHTML(row.fullname) : null
            }))
        };
    } catch (error) {
        console.error('Get nurse schedule by date error:', error);
        set.status = 500;
        return {
            success: false,
            message: 'Internal Server Error'
        };
    }
};