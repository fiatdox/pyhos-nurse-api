import { Context } from 'elysia';
import { his,nurse } from '../db';
import { RowDataPacket } from 'mysql2';
import { sanitizeHTML } from '../utils/sanitize';

// ฟังก์ชันสำหรับดึงข้อมูลผู้ป่วยตาม ward
export const getPatientsByWard = async ({ body, set }: Context) => {
    const { ward } = body as { ward: string };
    try {
        const [rows] = await his.execute<RowDataPacket[]>(
            `select i.an,i.hn,i.dchstts,CONCAT(p.pname,p.fname,' ',p.lname)as ptname  
            ,i.regdate,i.regtime,p.birthday,p.sex,a.bedno ,d.name  as doctor_name,i.ward
            from ipt i 
            left join patient p on p.hn=i.hn
            LEFT join iptadm a on a.an=i.an
            left join doctor d on d.code=i.incharge_doctor 
            where i.dchstts is null and i.ward = ? order by a.bedno asc`,
            [ward]
        );

        return {
            success: true,
            // Sanitize each patient's name before sending it back
            data: rows.map(row => ({
                ...row,
                ptname: sanitizeHTML(row.ptname)
            }))
        };
    } catch (error) {
        console.error('Get patients error:', error);
        set.status = 500;
        return {
            success: false,
            message: 'Internal Server Error'
        };
    }
};

// ฟังก์ชันสำหรับดึงข้อมูลผู้ป่วยตาม ward (จากตาราง admission_list)
export const getPatientByward = async ({ params, set }: Context) => {
    const { ward } = params as { ward: string };
    try {
        const sql = `
            SELECT 
                al.hn,
                al.an,
                al.patient_name,
                DATE_ADD(al.reg_datetime, INTERVAL 543 YEAR) AS reg_datetime,
                t.admission_type_name,
                al.incharge_doctor,
                s.name AS spclty_name,al.bedno 
            FROM admission_list al 
            LEFT JOIN spclty s ON s.spclty = al.spclty 
            LEFT JOIN admission_types t ON t.admission_type_id = al.admission_type_id 
            WHERE al.ward = ? AND al.status = '1' order BY al.bedno ASC
        `;
        const [rows] = await nurse.execute<RowDataPacket[]>(sql, [ward]);

        return {
            success: true,
            data: rows.map(row => ({
                ...row,
                patient_name: row.patient_name ? sanitizeHTML(row.patient_name) : null,
                incharge_doctor: row.incharge_doctor ? sanitizeHTML(row.incharge_doctor) : null,
                spclty_name: row.spclty_name ? sanitizeHTML(row.spclty_name) : null,
                admission_type_name: row.admission_type_name ? sanitizeHTML(row.admission_type_name) : null
            }))
        };
    } catch (error) {
        console.error('Get patient by ward error:', error);
        set.status = 500;
        return {
            success: false,
            message: 'Internal Server Error'
        };
    }
};

// ฟังก์ชันสำหรับลงทะเบียนผู้ป่วยใหม่
export const registerPatient = async ({ body, set }: Context) => {
    const {
        an,
        hn,
        patient_name,
        reg_datetime,
        birth_date,
        ward,
        spclty,
        admission_type_id,
        status,
        serverity_level_id,
        severity_level_id,
        incharge_doctor,
        gender,
        bedno,
        is_ventilator
    } = body as any;

    const connection = await nurse.getConnection();
    try {
        // --- (แนะนำ) ตรวจสอบว่า AN มีอยู่จริงในฐานข้อมูล HIS หรือไม่ ---
        const [existingPatient] = await his.execute<RowDataPacket[]>(
            `SELECT an, incharge_doctor FROM ipt WHERE an = ?`,
            [an]
        );
        if (existingPatient.length === 0) {
            set.status = 404;
            return { success: false, message: `Patient with AN '${an}' not found in the main system.` };
        }
        
        const finalInchargeDoctor = incharge_doctor || existingPatient[0].incharge_doctor || null;
        // ---------------------------------------------------------

        await connection.beginTransaction();

        // 1. เพิ่มข้อมูลลงในตาราง admission_list
        const [result] = await connection.execute(
            `INSERT INTO admission_list (an, hn, patient_name, reg_datetime, birth_date, ward, spclty, admission_type_id, status, severity_level_id, incharge_doctor, gender, bedno, is_ventilator, discharge_type_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [
                an, 
                hn, 
                patient_name, 
                reg_datetime, 
                birth_date ?? null,
                ward, 
                spclty ?? null, 
                admission_type_id ?? 0, 
                status ?? 'A', 
                severity_level_id ?? serverity_level_id ?? null, 
                finalInchargeDoctor ?? null, 
                gender ?? '', 
                bedno ?? null, 
                is_ventilator ?? 'N'
            ]
        );

        await connection.commit();

        const insertedId = (result as any).insertId;

        // 2. ดึงข้อมูลผู้ป่วยที่เพิ่งลงทะเบียนเพื่อส่งกลับไป
        const [rows] = await connection.execute<RowDataPacket[]>(
            `SELECT * FROM admission_list WHERE admission_list_id = ?`,
            [insertedId]
        );

        if (rows.length === 0) {
            throw new Error('Failed to retrieve patient details after registration.');
        }

        const registeredPatient = rows[0];
        return {
            success: true,
            message: 'Patient registered successfully.',
            data: {
                ...registeredPatient,
                patient_name: sanitizeHTML(registeredPatient.patient_name),
                incharge_doctor: registeredPatient.incharge_doctor ? sanitizeHTML(registeredPatient.incharge_doctor) : null
            }
        };

    } catch (error) {
        await connection.rollback();
        console.error('Register patient error:', error);
        set.status = 500;
        return {
            success: false,
            message: 'Internal Server Error during patient registration.'
        };
    } finally {
        connection.release();
    };
};

// ฟังก์ชันสำหรับดึงข้อมูลผู้ป่วยตาม AN
export const getPatientsBYAN = async ({ body, set }: Context) => {
    const { an } = body as { an: string };
    try {
        const [rows] = await his.execute<RowDataPacket[]>(
            `select i.an,i.hn,i.dchstts,CONCAT(p.pname,p.fname,' ',p.lname)as ptname  
            ,i.regdate,i.regtime,p.birthday,p.sex,a.bedno ,d.name  as doctor_name,i.ward,p.sex as gender
            from ipt i 
            left join patient p on p.hn=i.hn
            LEFT join iptadm a on a.an=i.an
            left join doctor d on d.code=i.incharge_doctor 
            where i.an = ? limit 1`,
            [an]
        );

        return {
            success: true,
            // Sanitize potentially malicious names before sending
            data: rows.map(row => ({
                ...row,
                ptname: sanitizeHTML(row.ptname),
                doctor_name: sanitizeHTML(row.doctor_name)
            }))
        };
    } catch (error) {
        console.error('Get patients by AN error:', error);
        set.status = 500;
        return {
            success: false,
            message: 'Internal Server Error'
        };
    }
};

// ฟังก์ชันบันทึกข้อมูลผู้ป่วยที่อยู่ในคาบเวรรับการพยาบาล
export const savePatientsInShift = async ({ body, set }: { body: any[], set: any }) => {
    // body ที่ส่งเข้ามาจะเป็น Array ของผู้ป่วยตามที่กำหนดใน Route
    const patients = body;

    if (!patients || patients.length === 0) {
        set.status = 400;
        return {
            success: false,
            message: 'ไม่พบข้อมูลที่ต้องการบันทึก'
        };
    }

    const connection = await nurse.getConnection();

    try {
        await connection.beginTransaction();

        // ใช้ SQL แบบ Bulk Insert เพื่อบันทึกทีเดียวหลายรายการ
        // สมมติชื่อตารางเป็น 'admission_change_shift' (ปรับแก้ตามจริง)
        // การใช้ ON DUPLICATE KEY UPDATE จะช่วยให้ถ้ามีข้อมูล key ซ้ำ (เช่น ผู้ป่วยเดิมในเวรเดิม) จะเป็นการแก้ไขข้อมูลแทนการเพิ่มใหม่
        const sql = `
            INSERT INTO admission_change_shift (
                admission_list_id, 
                admission_change_shift_type_id, 
                an, 
                hn, 
                ward, 
                shift_date, 
                staff, 
                severity_level_id, 
                ventilator_use, 
                comment,
                create_datetime
            ) VALUES ?
            ON DUPLICATE KEY UPDATE
                staff = VALUES(staff),
                severity_level_id = VALUES(severity_level_id),
                ventilator_use = VALUES(ventilator_use),
                comment = VALUES(comment),
                admission_change_shift_type_id = VALUES(admission_change_shift_type_id),
                update_datetime = NOW(),
                update_by = VALUES(staff)
        `;

        // เตรียมข้อมูลให้อยู่ในรูปแบบ Array of Arrays (Nested Array) สำหรับ mysql2
        const values = patients.map(p => [
            p.admission_list_id,
            p.admission_change_shift_type_id,
            p.an,
            p.hn,
            p.ward,
            p.shift_date,
            p.staff,
            p.severity_level_id,
            p.ventilator_use,
            p.comment,
            new Date()
        ]);

        // execute query โดยส่ง values เข้าไป (สังเกตเครื่องหมาย [] ครอบ values อีกทีเพื่อให้ mysql2 รู้ว่าเป็น bulk insert)
        await connection.query(sql, [values]);

        await connection.commit();

        return {
            success: true,
            message: `บันทึกข้อมูลเรียบร้อยแล้ว จำนวน ${patients.length} รายการ`
        };

    } catch (error) {
        await connection.rollback();
        console.error('Error saving patients in shift:', error);
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