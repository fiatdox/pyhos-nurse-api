import { Context } from 'elysia';
import { his,nurse } from '../db';
import { RowDataPacket } from 'mysql2';
import { sanitizeHTML } from '../utils/sanitize';

// ฟังก์ชั่นแสดงรายชื่อหอผู้ป่วย
export const getWards = async ({ set }: Context) => {
    try {
        const [rows] = await his.execute<RowDataPacket[]>(`SELECT ward,name FROM ward where ward_active='Y' order by name asc`);   
        return {
            success: true,
            // ป้องกันการโจมตีแบบ XSS โดยการลบแท็ก HTML ออกจากชื่อหอผู้ป่วย
            data: rows.map(row => ({
                ...row,
                name: sanitizeHTML(row.name)
            }))
        };
    } catch (error) {
        console.error('Get wards error:', error);
        set.status = 500;
        return {
            success: false,
            message: 'Internal Server Error'
        };
    }
};

// ฟังก์ชั่นแสดงรายชื่อหอผู้ป่วย
export const getWardsV1 = async ({ set }: Context) => {
    try {
        const [rows] = await nurse.execute<RowDataPacket[]>(`SELECT ward,ward_name,his_code,is_labor_room,is_active,general,crisis FROM ward where is_active='Y' order by ward_name desc`);
        return {
            success: true,
            // ป้องกันการโจมตีแบบ XSS โดยการลบแท็ก HTML ออกจากชื่อหอผู้ป่วย
            data: rows.map(row => ({
                ...row,
                ward_name: sanitizeHTML(row.ward_name)
            }))
        };
    } catch (error) {
        console.error('Get wards error:', error);
        set.status = 500;
        return {
            success: false,
            message: 'Internal Server Error'
        };
    }
};

export const getSpclty = async ({ set }: Context) => {
    try {
        const [rows] = await nurse.execute<RowDataPacket[]>(`select spclty,name from spclty  where is_active='Y' `);   
        return {
            success: true,
            // ป้องกันการโจมตีแบบ XSS โดยการลบแท็ก HTML ออกจากชื่อหอผู้ป่วย
            data: rows.map(row => ({
                ...row,
                name: sanitizeHTML(row.name)
            }))
        };
    } catch (error) {
        console.error('Get spclty error:', error);
        set.status = 500;
        return {
            success: false,
            message: 'Internal Server Error'
        };
    }
};

export const getAdmissionType= async ({ set }: Context) => {
    try {
        const [rows] = await nurse.execute<RowDataPacket[]>(`select admission_type_id,admission_type_name from admission_types   `);   
        return {
            success: true,
            // ป้องกันการโจมตีแบบ XSS โดยการลบแท็ก HTML ออกจากชื่อหอผู้ป่วย
            data: rows.map(row => ({
                ...row,
                admission_type_name: sanitizeHTML(row.admission_type_name)
            }))
        };
    } catch (error) {
        console.error('Get admission types error:', error);
        set.status = 500;
        return {
            success: false,
            message: 'Internal Server Error'
        };
    }
};

export const getAdmissionSeverityLV= async ({ set }: Context) => {
    try {
        const [rows] = await nurse.execute<RowDataPacket[]>(`select severity_level_id,severity_level_name from admission_severity_level   `);   
        return {
            success: true,
            // ป้องกันการโจมตีแบบ XSS โดยการลบแท็ก HTML ออกจากชื่อหอผู้ป่วย
            data: rows.map(row => ({
                ...row,
                severity_level_name: sanitizeHTML(row.severity_level_name)
            }))
        };
    } catch (error) {
        console.error('Get admission severity levels error:', error);
        set.status = 500;
        return {
            success: false,
            message: 'Internal Server Error'
        };
    }
};

// ฟังก์ชันสำหรับเพิ่มข้อมูลเจ้าหน้าที่
export const addStaff = async ({ body, set }: Context) => {
    const { fullname, staff_position_id, is_active } = body as { fullname: string; staff_position_id: number; is_active?: string };

    try {
        const [result] = await nurse.execute(
            `INSERT INTO staffs (fullname, staff_position_id, is_active) VALUES (?, ?, ?)`,
            [fullname, staff_position_id, is_active || 'Y']
        );

        return {
            success: true,
            message: 'Staff added successfully',
            staff_id: (result as any).insertId
        };
    } catch (error) {
        console.error('Add staff error:', error);
        set.status = 500;
        return {
            success: false,
            message: 'Internal Server Error'
        };
    }
};

export const getAllStaff = async ({ set }: Context) => {
    try {
        // Assuming the staff table is in the 'nurse' database and we only want active staff
        const [rows] = await nurse.execute<RowDataPacket[]>(`SELECT staff_id, fullname, sp.position_name  
            FROM staffs a 
            left join staff_position sp on sp.staff_position_id=a.staff_position_id
            WHERE is_active = 'Y'`);
        return {
            success: true,
            // Sanitize fullname to prevent XSS
            data: rows.map(row => ({
                ...row,
                fullname: sanitizeHTML(row.fullname)
            }))
        };
    } catch (error) {
        console.error('Get all staff error:', error);
        set.status = 500;
        return {
            success: false,
            message: 'Internal Server Error'
        };
    }
};

//ประเภทเวร
export const getAdmissionChangeShiftTypes= async ({ set }: Context) => {
    try {
        const [rows] = await nurse.execute<RowDataPacket[]>(`select admission_change_shift_type_id,shift_name from admission_change_shift_types   `);   
        return {
            success: true,
            // ป้องกันการโจมตีแบบ XSS โดยการลบแท็ก HTML ออกจากชื่อหอผู้ป่วย
            data: rows.map(row => ({
                ...row,
                shift_name: sanitizeHTML(row.shift_name)
            }))
        };
    } catch (error) {
        console.error('Get admission change shift types error:', error);
        set.status = 500;
        return {
            success: false,
            message: 'Internal Server Error'
        };
    }
};

// ฟังก์ชันสำหรับเคลียร์เจ้าหน้าที่ทั้งหมดออกจากหอผู้ป่วยตามรหัส
export const clearWardStaffsByWard = async ({ params, set }: Context) => {
    const { ward } = params as Record<string, string>;

    if (!ward) {
        set.status = 400;
        return {
            success: false,
            message: 'กรุณาระบุหอผู้ป่วย (ward)'
        };
    }

    try {
        const [result] = await nurse.execute(
            `DELETE FROM ward_staffs WHERE ward = ?`,
            [ward]
        );

        return {
            success: true,
            message: `ลบข้อมูลเจ้าหน้าที่ออกจากหอผู้ป่วยเรียบร้อยแล้ว จำนวน ${(result as any).affectedRows} รายการ`
        };
    } catch (error) {
        console.error('Clear ward staffs error:', error);
        set.status = 500;
        return {
            success: false,
            message: 'Internal Server Error'
        };
    }
};

// ฟังก์ชันสำหรับจัดการเจ้าหน้าที่ประจำหอผู้ป่วย (รับเป็น Array ของ Object และใช้หลักการ Replace All)
export const addWardStaffs = async ({ body, set }: Context) => {
    const payload = body as { staff_id: string | number; ward: string | number }[];

    if (!Array.isArray(payload) || payload.length === 0) {
        set.status = 400;
        return {
            success: false,
            message: 'ไม่พบข้อมูลที่ต้องการบันทึก หรือรูปแบบข้อมูลไม่ถูกต้อง'
        };
    }

    // ขอ Connection จาก Pool เพื่อทำ Transaction ป้องกันข้อมูลสูญหายกรณีเกิด Error กลางทาง
    const connection = await nurse.getConnection();

    try {
        await connection.beginTransaction();

        // ดึงรายชื่อตึก (ward) ที่ไม่ซ้ำกันทั้งหมดจาก Payload เพื่อนำไปลบข้อมูลเก่าออกก่อน
        const uniqueWards = [...new Set(payload.map(item => item.ward))];

        // 1. ลบข้อมูลเจ้าหน้าที่ของตึกที่อยู่ในรายการนี้ออกทั้งหมด (Replace All)
        let deletedCount = 0;
        for (const ward of uniqueWards) {
            const [deleteResult] = await connection.query(
                `DELETE FROM ward_staffs WHERE ward = ?`,
                [ward]
            );
            deletedCount += (deleteResult as any).affectedRows || 0;
        }

        // 2. เพิ่มข้อมูลใหม่ (จาก Payload ทั้งหมดที่ส่งมา)
        const values = payload.map(item => [item.staff_id, item.ward]);
        const insertSql = `INSERT INTO ward_staffs (staff_id, ward) VALUES ?`;
        const [insertResult] = await connection.query(insertSql, [values]);
        const insertedCount = (insertResult as any).affectedRows || 0;

        await connection.commit();

        return {
            success: true,
            message: `ปรับปรุงข้อมูลเรียบร้อยแล้ว (เพิ่มใหม่ ${insertedCount} รายการ, ลบออก ${deletedCount} รายการ)`
        };
    } catch (error) {
        await connection.rollback();
        console.error('Add ward staffs error:', error);
        set.status = 500;
        return {
            success: false,
            message: 'Internal Server Error'
        };
    } finally {
        connection.release();
    }
};

// ระดับการดูแลผู้ป่วยในเวร
export const getAdmissionShiftCareLevels = async ({ set }: Context) => {
    try {
        const [rows] = await nurse.execute<RowDataPacket[]>(
            `SELECT admission_shift_care_level_id, name FROM admission_shift_care_levels WHERE is_active = 'Y'`
        );
        return {
            success: true,
            data: rows.map(row => ({
                ...row,
                name: sanitizeHTML(row.name)
            }))
        };
    } catch (error) {
        console.error('Get admission shift care levels error:', error);
        set.status = 500;
        return {
            success: false,
            message: 'Internal Server Error'
        };
    }
};

// ฟังก์ชันสำหรับดึงเจ้าหน้าที่ตามหอผู้ป่วย
export const getWardStaffByWard = async ({ params, set }: Context) => {
    const { id } = params as Record<string, string>;

    try {
        const [rows] = await nurse.execute<RowDataPacket[]>(
            `SELECT ws.staff_id, ws.ward, s.fullname, sp.position_name 
             FROM ward_staffs ws
             JOIN staffs s ON ws.staff_id = s.staff_id
             LEFT JOIN staff_position sp ON s.staff_position_id = sp.staff_position_id
             WHERE ws.ward = ? AND s.is_active = 'Y'`,
            [id]
        );

        return {
            success: true,
            data: rows.map(row => ({
                ...row,
                fullname: sanitizeHTML(row.fullname)
            }))
        };
    } catch (error) {
        console.error('Get ward staffs by ward error:', error);
        set.status = 500;
        return {
            success: false,
            message: 'Internal Server Error'
        };
    }
};
