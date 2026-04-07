import { Context } from 'elysia';
import { his,nurse } from '../db';
import { RowDataPacket } from 'mysql2';
import { sanitizeHTML } from '../utils/sanitize';

//ฟังก์ชั่นบันทึกตารางพยาบาลและเจ้าหน้าที่
export const addNurseSchedule = async ({ body, set }: Context) => {
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

        let inserted = 0;
        let updated = 0;

        // จัดกลุ่ม base codes ที่ส่งมาแต่ละ (staff_id, shift_date, ward)
        // เพื่อลบ record ที่ไม่ได้ส่งมาใน scope นั้น
        const scopeMap = new Map<string, string[]>();
        for (const s of schedules) {
            const baseCode = s.shift_code.split('_')[0];
            const key = `${s.staff_id}|${s.shift_date}|${s.ward}`;
            if (!scopeMap.has(key)) scopeMap.set(key, []);
            const bases = scopeMap.get(key)!;
            if (!bases.includes(baseCode)) bases.push(baseCode);
        }

        for (const [key, baseCodes] of scopeMap) {
            const [staffId, shiftDate, ward] = key.split('|');
            // ลบ record ที่ base code ไม่อยู่ใน payload
            const notInPlaceholders = baseCodes.map(() => `(shift_code = ? OR shift_code LIKE ?)`).join(' OR ');
            const notInParams = baseCodes.flatMap(b => [b, `${b}\\_%`]);
            await connection.execute(
                `DELETE FROM nurse_shift_assignments
                 WHERE staff_id = ? AND shift_date = ? AND ward = ?
                   AND NOT (${notInPlaceholders})`,
                [staffId, shiftDate, ward, ...notInParams]
            );
        }

        for (const s of schedules) {
            // base shift = ส่วนก่อน '_' เช่น A_OT → A, N_OT4 → N, M → M
            const baseCode = s.shift_code.split('_')[0];

            const [existing] = await connection.execute<RowDataPacket[]>(
                `SELECT shift_assignment_id FROM nurse_shift_assignments
                 WHERE staff_id = ? AND shift_date = ? AND ward = ?
                   AND (shift_code = ? OR shift_code LIKE ?)
                 LIMIT 1`,
                [s.staff_id, s.shift_date, s.ward, baseCode, `${baseCode}\\_%`]
            );

            if (existing.length > 0) {
                await connection.execute(
                    `UPDATE nurse_shift_assignments SET
                        shift_code = ?,
                        nurse_shift_type_id = ?,
                        updated_at = NOW(),
                        updated_by = ?
                     WHERE shift_assignment_id = ?`,
                    [s.shift_code, s.nurse_shift_type_id ?? null, s.updated_by || s.created_by || null, existing[0].shift_assignment_id]
                );
                updated++;
            } else {
                await connection.execute(
                    `INSERT INTO nurse_shift_assignments (staff_id, shift_date, shift_code, ward, nurse_shift_type_id, created_at, created_by)
                     VALUES (?, ?, ?, ?, ?, NOW(), ?)`,
                    [s.staff_id, s.shift_date, s.shift_code, s.ward, s.nurse_shift_type_id ?? null, s.created_by || s.updated_by || null]
                );
                inserted++;
            }
        }

        await connection.commit();

        return {
            success: true,
            message: `บันทึกเรียบร้อยแล้ว (เพิ่มใหม่ ${inserted} รายการ, อัพเดท ${updated} รายการ)`
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
            FROM nurse_shift_assignments sa
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
        const sql = `DELETE FROM nurse_shift_assignments WHERE shift_assignment_id IN (?)`;

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
            FROM nurse_shift_assignments sa
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

// ฟังก์ชันสำหรับคำนวณ FTE ตาม ward และช่วงวันที่
export const getFTEByWard = async ({ body, set }: { body: { ward: string, month: string }, set: any }) => {
    const { ward, month } = body;

    if (!ward || !month) {
        set.status = 400;
        return {
            success: false,
            message: 'กรุณาระบุ ward และ month (รูปแบบ YYYY-MM)'
        };
    }

    try {
        const [rows] = await nurse.execute<RowDataPacket[]>(
            `SELECT DATE(acs.shift_date) AS shift_date,
                acs.ward,
                st.admission_change_shift_type_id AS shift_id,
                st.shift_name,
                st.weight AS shift_weight,
                SUM(CASE WHEN (acs.ventilator_use IN ('N') OR acs.ventilator_use IS NULL) AND acs.oxygen_support_type_id = 1 THEN 1 ELSE 0 END) AS normal_count,
                SUM(CASE WHEN (acs.ventilator_use IN ('N') OR acs.ventilator_use IS NULL) AND acs.oxygen_support_type_id = 2 THEN 1 ELSE 0 END) AS o2_count,
                SUM(CASE WHEN (acs.ventilator_use IN ('N') OR acs.ventilator_use IS NULL) AND acs.oxygen_support_type_id = 3 THEN 1 ELSE 0 END) AS hfnc_count,
                SUM(CASE WHEN acs.ventilator_use IN ('N') OR acs.ventilator_use IS NULL THEN 1 ELSE 0 END) AS general_count,
                SUM(CASE WHEN acs.ventilator_use IN ('Y','C') THEN 1 ELSE 0 END) AS crisis_count,
                SUM(CASE WHEN acs.severity_level_id = 1 THEN 1 ELSE 0 END) AS severity_1,
                SUM(CASE WHEN acs.severity_level_id = 2 THEN 1 ELSE 0 END) AS severity_2,
                SUM(CASE WHEN acs.severity_level_id = 3 THEN 1 ELSE 0 END) AS severity_3,
                SUM(CASE WHEN acs.severity_level_id = 4 THEN 1 ELSE 0 END) AS severity_4,
                SUM(CASE WHEN acs.severity_level_id = 5 THEN 1 ELSE 0 END) AS severity_5,
                COUNT(*) AS total_count,
                w.general AS general_score,
                w.crisis AS crisis_score,
                ROUND(
                    (
                        w.general * SUM(CASE WHEN acs.ventilator_use IN ('N') OR acs.ventilator_use IS NULL THEN 1 ELSE 0 END)
                        + w.crisis * SUM(CASE WHEN acs.ventilator_use IN ('Y','C') THEN 1 ELSE 0 END)
                    ) * (st.weight / 100) / 7
                , 2) AS fte,
                w.his_code,
                acs.admission_change_shift_type_id,
                (SELECT COUNT(nsa.staff_id) FROM nurse_shift_assignments nsa LEFT JOIN staffs s ON s.staff_id=nsa.staff_id LEFT JOIN nurse_shift_types nst ON nst.nurse_shift_type_id=nsa.nurse_shift_type_id LEFT JOIN admission_change_shift_types acst ON acst.admission_change_shift_type_id=nst.admission_change_shift_type_id WHERE nsa.shift_date=acs.shift_date AND s.staff_position_id='1' AND nsa.ward=acs.ward AND acst.admission_change_shift_type_id=st.admission_change_shift_type_id AND nst.nurse_shift_type_id=(CASE WHEN st.admission_change_shift_type_id=1 THEN 7 WHEN st.admission_change_shift_type_id=2 THEN 4 WHEN st.admission_change_shift_type_id=3 THEN 1 END)) AS RN_NOT_OT,
                (SELECT COUNT(nsa.staff_id) FROM nurse_shift_assignments nsa LEFT JOIN staffs s ON s.staff_id=nsa.staff_id LEFT JOIN nurse_shift_types nst ON nst.nurse_shift_type_id=nsa.nurse_shift_type_id LEFT JOIN admission_change_shift_types acst ON acst.admission_change_shift_type_id=nst.admission_change_shift_type_id WHERE nsa.shift_date=acs.shift_date AND s.staff_position_id='2' AND nsa.ward=acs.ward AND acst.admission_change_shift_type_id=st.admission_change_shift_type_id AND nst.nurse_shift_type_id=(CASE WHEN st.admission_change_shift_type_id=1 THEN 7 WHEN st.admission_change_shift_type_id=2 THEN 4 WHEN st.admission_change_shift_type_id=3 THEN 1 END)) AS TN_NOT_OT,
                (SELECT COUNT(nsa.staff_id) FROM nurse_shift_assignments nsa LEFT JOIN staffs s ON s.staff_id=nsa.staff_id LEFT JOIN nurse_shift_types nst ON nst.nurse_shift_type_id=nsa.nurse_shift_type_id LEFT JOIN admission_change_shift_types acst ON acst.admission_change_shift_type_id=nst.admission_change_shift_type_id WHERE nsa.shift_date=acs.shift_date AND s.staff_position_id='3' AND nsa.ward=acs.ward AND acst.admission_change_shift_type_id=st.admission_change_shift_type_id AND nst.nurse_shift_type_id=(CASE WHEN st.admission_change_shift_type_id=1 THEN 7 WHEN st.admission_change_shift_type_id=2 THEN 4 WHEN st.admission_change_shift_type_id=3 THEN 1 END)) AS PN_NOT_OT,
                (SELECT COUNT(nsa.staff_id) FROM nurse_shift_assignments nsa LEFT JOIN staffs s ON s.staff_id=nsa.staff_id LEFT JOIN nurse_shift_types nst ON nst.nurse_shift_type_id=nsa.nurse_shift_type_id LEFT JOIN admission_change_shift_types acst ON acst.admission_change_shift_type_id=nst.admission_change_shift_type_id WHERE nsa.shift_date=acs.shift_date AND s.staff_position_id='1' AND nsa.ward=acs.ward AND acst.admission_change_shift_type_id=st.admission_change_shift_type_id AND nst.nurse_shift_type_id=(CASE WHEN st.admission_change_shift_type_id=1 THEN 8 WHEN st.admission_change_shift_type_id=2 THEN 5 WHEN st.admission_change_shift_type_id=3 THEN 2 END)) AS RN_OT8,
                (SELECT COUNT(nsa.staff_id) FROM nurse_shift_assignments nsa LEFT JOIN staffs s ON s.staff_id=nsa.staff_id LEFT JOIN nurse_shift_types nst ON nst.nurse_shift_type_id=nsa.nurse_shift_type_id LEFT JOIN admission_change_shift_types acst ON acst.admission_change_shift_type_id=nst.admission_change_shift_type_id WHERE nsa.shift_date=acs.shift_date AND s.staff_position_id='2' AND nsa.ward=acs.ward AND acst.admission_change_shift_type_id=st.admission_change_shift_type_id AND nst.nurse_shift_type_id=(CASE WHEN st.admission_change_shift_type_id=1 THEN 8 WHEN st.admission_change_shift_type_id=2 THEN 5 WHEN st.admission_change_shift_type_id=3 THEN 2 END)) AS TN_OT8,
                (SELECT COUNT(nsa.staff_id) FROM nurse_shift_assignments nsa LEFT JOIN staffs s ON s.staff_id=nsa.staff_id LEFT JOIN nurse_shift_types nst ON nst.nurse_shift_type_id=nsa.nurse_shift_type_id LEFT JOIN admission_change_shift_types acst ON acst.admission_change_shift_type_id=nst.admission_change_shift_type_id WHERE nsa.shift_date=acs.shift_date AND s.staff_position_id='3' AND nsa.ward=acs.ward AND acst.admission_change_shift_type_id=st.admission_change_shift_type_id AND nst.nurse_shift_type_id=(CASE WHEN st.admission_change_shift_type_id=1 THEN 8 WHEN st.admission_change_shift_type_id=2 THEN 5 WHEN st.admission_change_shift_type_id=3 THEN 2 END)) AS PN_OT8,
                (SELECT COUNT(nsa.staff_id) FROM nurse_shift_assignments nsa LEFT JOIN staffs s ON s.staff_id=nsa.staff_id LEFT JOIN nurse_shift_types nst ON nst.nurse_shift_type_id=nsa.nurse_shift_type_id LEFT JOIN admission_change_shift_types acst ON acst.admission_change_shift_type_id=nst.admission_change_shift_type_id WHERE nsa.shift_date=acs.shift_date AND s.staff_position_id='1' AND nsa.ward=acs.ward AND acst.admission_change_shift_type_id=st.admission_change_shift_type_id AND nst.nurse_shift_type_id=(CASE WHEN st.admission_change_shift_type_id=1 THEN 9 WHEN st.admission_change_shift_type_id=2 THEN 6 WHEN st.admission_change_shift_type_id=3 THEN 3 END)) AS RN_OT4,
                (SELECT COUNT(nsa.staff_id) FROM nurse_shift_assignments nsa LEFT JOIN staffs s ON s.staff_id=nsa.staff_id LEFT JOIN nurse_shift_types nst ON nst.nurse_shift_type_id=nsa.nurse_shift_type_id LEFT JOIN admission_change_shift_types acst ON acst.admission_change_shift_type_id=nst.admission_change_shift_type_id WHERE nsa.shift_date=acs.shift_date AND s.staff_position_id='2' AND nsa.ward=acs.ward AND acst.admission_change_shift_type_id=st.admission_change_shift_type_id AND nst.nurse_shift_type_id=(CASE WHEN st.admission_change_shift_type_id=1 THEN 9 WHEN st.admission_change_shift_type_id=2 THEN 6 WHEN st.admission_change_shift_type_id=3 THEN 3 END)) AS TN_OT4,
                (SELECT COUNT(nsa.staff_id) FROM nurse_shift_assignments nsa LEFT JOIN staffs s ON s.staff_id=nsa.staff_id LEFT JOIN nurse_shift_types nst ON nst.nurse_shift_type_id=nsa.nurse_shift_type_id LEFT JOIN admission_change_shift_types acst ON acst.admission_change_shift_type_id=nst.admission_change_shift_type_id WHERE nsa.shift_date=acs.shift_date AND s.staff_position_id='3' AND nsa.ward=acs.ward AND acst.admission_change_shift_type_id=st.admission_change_shift_type_id AND nst.nurse_shift_type_id=(CASE WHEN st.admission_change_shift_type_id=1 THEN 9 WHEN st.admission_change_shift_type_id=2 THEN 6 WHEN st.admission_change_shift_type_id=3 THEN 3 END)) AS PN_OT4
            FROM admission_change_shift acs
            LEFT JOIN admission_change_shift_types st ON st.admission_change_shift_type_id = acs.admission_change_shift_type_id
            LEFT JOIN ward w ON w.his_code = acs.ward
            WHERE DATE_FORMAT(acs.shift_date, '%Y-%m') = ?
            AND acs.ward = ?
            GROUP BY
                DATE(acs.shift_date),
                acs.ward,
                st.admission_change_shift_type_id,
                st.shift_name,
                st.weight,
                w.general,
                w.crisis
            ORDER BY DATE(acs.shift_date) ASC, st.admission_change_shift_type_id ASC`,
            [month, ward]
        );

        return {
            success: true,
            data: rows
        };
    } catch (error) {
        console.error('Get FTE by ward error:', error);
        set.status = 500;
        return {
            success: false,
            message: 'Internal Server Error'
        };
    }
};

// ฟังก์ชันสำหรับดึงประเภทเวรของเจ้าหน้าที่ เรียงตาม display_order
export const getNurseShiftTypes = async ({ set }: Context) => {
    try {
        const [rows] = await nurse.execute<RowDataPacket[]>(
            `SELECT nurse_shift_type_id, code, name, admission_change_shift_type_id, display_order,description
             FROM nurse_shift_types
             ORDER BY display_order ASC`
        );

        return {
            success: true,
            data: rows
        };
    } catch (error) {
        console.error('Get nurse shift types error:', error);
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
            FROM nurse_shift_assignments sa
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