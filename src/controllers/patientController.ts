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
            ,concat(i.regdate,' ',i.regtime) as regdate,p.birthday,p.sex,a.bedno ,d.name  as doctor_name,i.ward
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
        is_ventilator,
        admission_change_shift_type_id,
        before_ward,           // ✅ ward ต้นทาง (กรณีรับย้าย)
        oxygen_support_type,   // ✅ 1=room_air, 2=oxygen, 3=hfnc, null=ใส่เครื่อง/C/S
    } = body as any;

    const connection = await nurse.getConnection();
    try {
        // --- ตรวจสอบว่า AN มีอยู่จริงในฐานข้อมูล HIS ---
        const [existingPatient] = await his.execute<RowDataPacket[]>(
            `SELECT an, incharge_doctor FROM ipt WHERE an = ?`,
            [an]
        );
        if (existingPatient.length === 0) {
            set.status = 404;
            return { success: false, message: `Patient with AN '${an}' not found in the main system.` };
        }

        const finalInchargeDoctor = incharge_doctor || existingPatient[0].incharge_doctor || null;

        await connection.beginTransaction();

        // 1. เพิ่มข้อมูลลงในตาราง admission_list
        const [result] = await connection.execute(
            `INSERT INTO admission_list (
                an, hn, patient_name, reg_datetime, birth_date,
                ward, spclty, admission_type_id, status, severity_level_id,
                incharge_doctor, gender, bedno, is_ventilator,
                before_ward, oxygen_support_type_id,
                discharge_type_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
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
                is_ventilator ?? 'N',
                before_ward ?? null,                                    // ✅ varchar(10)
                is_ventilator === 'N' ? (oxygen_support_type ?? null) : null, // ✅ tinyint(4)
            ]
        );

        const insertedId = (result as any).insertId;

        // 2. เพิ่มข้อมูลลงในตาราง admission_change_shift
        const regDateObj = reg_datetime ? new Date(reg_datetime) : new Date();
        const shift_date = !isNaN(regDateObj.getTime())
            ? regDateObj.toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];

        const shift_type_id = admission_change_shift_type_id || 1;
        const finalSeverity = severity_level_id ?? serverity_level_id ?? null;

        await connection.execute(
            `INSERT INTO admission_change_shift (
                admission_list_id,
                admission_change_shift_type_id,
                an,
                hn,
                ward,
                shift_date,
                severity_level_id,
                ventilator_use,
                create_datetime
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [insertedId, shift_type_id, an, hn, ward, shift_date, finalSeverity, is_ventilator ?? 'N']
        );

        await connection.commit();

        // 3. ดึงข้อมูลผู้ป่วยที่เพิ่งลงทะเบียนเพื่อส่งกลับ
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
                incharge_doctor: registeredPatient.incharge_doctor
                    ? sanitizeHTML(registeredPatient.incharge_doctor)
                    : null,
            },
        };

    } catch (error) {
        await connection.rollback();
        console.error('Register patient error:', error);
        set.status = 500;
        return {
            success: false,
            message: 'Internal Server Error during patient registration.',
        };
    } finally {
        connection.release();
    }
};
// export const registerPatient = async ({ body, set }: Context) => {
//     const {
//         an,
//         hn,
//         patient_name,
//         reg_datetime,
//         birth_date,
//         ward,
//         spclty,
//         admission_type_id,
//         status,
//         serverity_level_id,
//         severity_level_id,
//         incharge_doctor,
//         gender,
//         bedno,
//         is_ventilator,
//         admission_change_shift_type_id
//     } = body as any;

//     const connection = await nurse.getConnection();
//     try {
//         // --- (แนะนำ) ตรวจสอบว่า AN มีอยู่จริงในฐานข้อมูล HIS หรือไม่ ---
//         const [existingPatient] = await his.execute<RowDataPacket[]>(
//             `SELECT an, incharge_doctor FROM ipt WHERE an = ?`,
//             [an]
//         );
//         if (existingPatient.length === 0) {
//             set.status = 404;
//             return { success: false, message: `Patient with AN '${an}' not found in the main system.` };
//         }
        
//         const finalInchargeDoctor = incharge_doctor || existingPatient[0].incharge_doctor || null;
//         // ---------------------------------------------------------

//         await connection.beginTransaction();

//         // 1. เพิ่มข้อมูลลงในตาราง admission_list
//         const [result] = await connection.execute(
//             `INSERT INTO admission_list (an, hn, patient_name, reg_datetime, birth_date, ward, spclty, admission_type_id, status, severity_level_id, incharge_doctor, gender, bedno, is_ventilator, discharge_type_id) 
//              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
//             [
//                 an, 
//                 hn, 
//                 patient_name, 
//                 reg_datetime, 
//                 birth_date ?? null,
//                 ward, 
//                 spclty ?? null, 
//                 admission_type_id ?? 0, 
//                 status ?? 'A', 
//                 severity_level_id ?? serverity_level_id ?? null, 
//                 finalInchargeDoctor ?? null, 
//                 gender ?? '', 
//                 bedno ?? null, 
//                 is_ventilator ?? 'N'
//             ]
//         );

//         const insertedId = (result as any).insertId;

//         // 2. เพิ่มข้อมูลลงในตาราง admission_change_shift ทันทีเพื่อเชื่อมโยงข้อมูล
//         const regDateObj = reg_datetime ? new Date(reg_datetime) : new Date();
//         const shift_date = !isNaN(regDateObj.getTime()) 
//             ? regDateObj.toISOString().split('T')[0] 
//             : new Date().toISOString().split('T')[0];
            
//         const shift_type_id = admission_change_shift_type_id || 1; // ค่าเริ่มต้นประเภทเวรเป็น 1
//         const finalSeverity = severity_level_id ?? serverity_level_id ?? null;

//         await connection.execute(
//             `INSERT INTO admission_change_shift (
//                 admission_list_id, 
//                 admission_change_shift_type_id, 
//                 an, 
//                 hn, 
//                 ward, 
//                 shift_date, 
//                 severity_level_id, 
//                 ventilator_use, 
//                 create_datetime
//             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
//             [insertedId, shift_type_id, an, hn, ward, shift_date, finalSeverity, is_ventilator ?? 'N']
//         );

//         await connection.commit();

//         // 3. ดึงข้อมูลผู้ป่วยที่เพิ่งลงทะเบียนเพื่อส่งกลับไป
//         const [rows] = await connection.execute<RowDataPacket[]>(
//             `SELECT * FROM admission_list WHERE admission_list_id = ?`,
//             [insertedId]
//         );

//         if (rows.length === 0) {
//             throw new Error('Failed to retrieve patient details after registration.');
//         }

//         const registeredPatient = rows[0];
//         return {
//             success: true,
//             message: 'Patient registered successfully.',
//             data: {
//                 ...registeredPatient,
//                 patient_name: sanitizeHTML(registeredPatient.patient_name),
//                 incharge_doctor: registeredPatient.incharge_doctor ? sanitizeHTML(registeredPatient.incharge_doctor) : null
//             }
//         };

//     } catch (error) {
//         await connection.rollback();
//         console.error('Register patient error:', error);
//         set.status = 500;
//         return {
//             success: false,
//             message: 'Internal Server Error during patient registration.'
//         };
//     } finally {
//         connection.release();
//     };
// };

// ฟังก์ชันสำหรับดึงข้อมูลผู้ป่วยตาม AN
export const getPatientsBYAN = async ({ body, set }: Context) => {
    const { an } = body as { an: string };
    try {
        const [rows] = await his.execute<RowDataPacket[]>(
            `select i.an,i.hn,i.dchstts,CONCAT(p.pname,p.fname,' ',p.lname)as ptname  
            ,concat(i.regdate,' ',i.regtime)as regdate,p.birthday,p.sex,a.bedno ,d.name  as doctor_name,i.ward,p.sex as gender
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

// ฟังก์ชันบันทึกข้อมูลอาการผู้ป่วยรายเวร (Shift Assessment)
export const saveShiftAssessment = async ({ body, set }: Context) => {
    const {
        admission_list_id,
        admission_change_shift_type_id,
        an,
        hn,
        ward,
        shift_date,
        staff,
        severity_level_id,
        ventilator_use,
        level_of_care,
        pain_score,
        fall_risk,
        pressure_sore_risk,
        gcs_eye,
        gcs_verbal,
        gcs_motor,
        oxygen_support_type_id,
        safety_precautions,
        comment,
    } = body as any;

    // แปลง optional fields ให้เป็น null ทั้งหมดเพื่อป้องกัน undefined
    const safeStaff = staff ?? null;
    const safeVentilatorUse = ventilator_use ?? null;
    const safeLevelOfCare = level_of_care ?? null;
    const safePainScore = pain_score ?? null;
    const safeFallRisk = fall_risk ?? null;
    const safePressureSoreRisk = pressure_sore_risk ?? null;
    const safeGcsEye = gcs_eye ?? null;
    const safeGcsVerbal = gcs_verbal ?? null;
    const safeGcsMotor = gcs_motor ?? null;
    const safeOxygenSupportTypeId = oxygen_support_type_id ?? null;
    const safeSafetyPrecautions = safety_precautions ? JSON.stringify(safety_precautions) : null;
    const safeComment = comment ?? null;

    try {
        // ใช้ INSERT ... ON DUPLICATE KEY UPDATE ตาม UNIQUE KEY (admission_list_id, admission_change_shift_type_id)
        // พร้อมเช็ค ward และ shift_date เพิ่มเติมตามที่ต้องการ
        const [result] = await nurse.execute(
            `INSERT INTO admission_change_shift (
                admission_list_id, admission_change_shift_type_id,
                an, hn, ward, shift_date, staff,
                severity_level_id, ventilator_use,
                level_of_care, pain_score, fall_risk, pressure_sore_risk,
                gcs_eye, gcs_verbal, gcs_motor, oxygen_support_type_id,
                safety_precautions, comment, create_datetime
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE
                an = VALUES(an),
                hn = VALUES(hn),
                ward = VALUES(ward),
                shift_date = VALUES(shift_date),
                staff = VALUES(staff),
                severity_level_id = VALUES(severity_level_id),
                ventilator_use = VALUES(ventilator_use),
                level_of_care = VALUES(level_of_care),
                pain_score = VALUES(pain_score),
                fall_risk = VALUES(fall_risk),
                pressure_sore_risk = VALUES(pressure_sore_risk),
                gcs_eye = VALUES(gcs_eye),
                gcs_verbal = VALUES(gcs_verbal),
                gcs_motor = VALUES(gcs_motor),
                oxygen_support_type_id = VALUES(oxygen_support_type_id),
                safety_precautions = VALUES(safety_precautions),
                comment = VALUES(comment),
                update_datetime = NOW(),
                update_by = VALUES(staff)`,
            [
                admission_list_id, admission_change_shift_type_id,
                an, hn, ward, shift_date, safeStaff,
                severity_level_id, safeVentilatorUse,
                safeLevelOfCare, safePainScore, safeFallRisk, safePressureSoreRisk,
                safeGcsEye, safeGcsVerbal, safeGcsMotor, safeOxygenSupportTypeId,
                safeSafetyPrecautions, safeComment
            ]
        );

        const affectedRows = (result as any).affectedRows;
        // affectedRows = 1 → INSERT ใหม่, affectedRows = 2 → UPDATE ข้อมูลเดิม
        const action = affectedRows === 1 ? 'created' : 'updated';

        return {
            success: true,
            message: action === 'created'
                ? 'บันทึกข้อมูลอาการผู้ป่วยรายเวรเรียบร้อยแล้ว'
                : 'อัพเดทข้อมูลอาการผู้ป่วยรายเวรเรียบร้อยแล้ว',
            admission_change_shift_id: (result as any).insertId,
            action
        };
    } catch (error) {
        console.error('Save shift assessment error:', error);
        set.status = 500;
        return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลอาการผู้ป่วยรายเวร',
            error: String(error)
        };
    }
};

// ฟังก์ชันดึงข้อมูลอาการผู้ป่วยรายเวร (Shift Assessment)
export const getShiftAssessment = async ({ body, set }: Context) => {
    const { admission_list_id, shift_date, admission_change_shift_type_id, ward } = body as {
        admission_list_id: number;
        shift_date: string;
        admission_change_shift_type_id: number;
        ward: string;
    };

    try {
        const [rows] = await nurse.execute<RowDataPacket[]>(
            `SELECT
                admission_list_id, admission_change_shift_type_id, an, hn, ward, shift_date, staff,
                severity_level_id, ventilator_use, level_of_care, pain_score, fall_risk, pressure_sore_risk,
                gcs_eye, gcs_verbal, gcs_motor, oxygen_support_type_id,
                safety_precautions, comment, create_datetime, update_datetime, update_by
             FROM admission_change_shift
             WHERE admission_list_id = ? AND DATE(shift_date) = DATE(?) AND admission_change_shift_type_id = ? AND ward = ?
             LIMIT 1`,
            [admission_list_id, shift_date, admission_change_shift_type_id, ward]
        );

        if (rows.length === 0) {
            return { success: true, data: null };
        }

        const row = rows[0];
        return {
            success: true,
            data: {
                ...row,
                safety_precautions: row.safety_precautions ? JSON.parse(row.safety_precautions) : null,
                comment: row.comment ? sanitizeHTML(row.comment) : null,
                staff: row.staff ? sanitizeHTML(row.staff) : null,
            }
        };
    } catch (error) {
        console.error('Get shift assessment error:', error);
        set.status = 500;
        return {
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลอาการผู้ป่วยรายเวร'
        };
    }
};

// ฟังก์ชันสำหรับดึงข้อมูลผู้ป่วยที่ลงทะเบียนตาม ward พร้อมข้อมูลเวร (Shift Records)
export const getPatientsRegisterByWard = async ({ params, set }: Context) => {
    const { ward } = params as { ward: string };

    try {
        // 1. ดึงข้อมูลผู้ป่วยจาก admission_list
        const [patients] = await nurse.execute<RowDataPacket[]>(
            `SELECT 
                al.admission_list_id,
                al.hn,
                al.an,
                al.patient_name AS name,
                TIMESTAMPDIFF(YEAR, al.birth_date, CURDATE()) AS age,
                al.ward,
                al.bedno AS bed,
                al.reg_datetime,
                s.name AS spcltyName,
                al.incharge_doctor
            FROM admission_list al
            LEFT JOIN spclty s ON s.spclty = al.spclty
            WHERE al.ward = ? AND al.status IN ('1', 'A')
            ORDER BY al.bedno ASC`,
            [ward]
        );

        if (patients.length === 0) {
            return { success: true, data: [] };
        }

        // 2. ดึงข้อมูล wardName จาก HIS
        const [wardData] = await his.execute<RowDataPacket[]>(
            `SELECT name FROM ward WHERE ward = ?`,
            [ward]
        );
        const wardName = wardData.length > 0 ? wardData[0].name : ward;

        // 3. ดึงข้อมูล doctorName จาก HIS
        const doctorCodes = [...new Set(patients.map(p => p.incharge_doctor).filter(Boolean))];
        let doctorMap: Record<string, string> = {};
        if (doctorCodes.length > 0) {
            const placeholders = doctorCodes.map(() => '?').join(',');
            const [doctors] = await his.execute<RowDataPacket[]>(
                `SELECT code, name FROM doctor WHERE code IN (${placeholders})`,
                doctorCodes
            );
            doctors.forEach(d => {
                doctorMap[d.code] = d.name;
            });
        }

        // 4. ดึงข้อมูล Shift Records
        const ans = patients.map(p => p.an);
        let shiftsMap: Record<string, any[]> = {};
        if (ans.length > 0) {
            const placeholders = ans.map(() => '?').join(',');
            const [shifts] = await nurse.execute<RowDataPacket[]>(
                `SELECT 
                    an,
                    shift_date,
                    admission_change_shift_type_id AS shiftId,
                    ventilator_use,
                    severity_level_id AS severityLevel
                FROM admission_change_shift
                WHERE an IN (${placeholders})
                ORDER BY shift_date ASC, admission_change_shift_type_id ASC`,
                ans
            );

            shifts.forEach(shift => {
                if (!shiftsMap[shift.an]) shiftsMap[shift.an] = [];
                
                const sDate = new Date(shift.shift_date);
                let formattedDate = null;
                if (!isNaN(sDate.getTime())) {
                    const pad = (n: number) => n.toString().padStart(2, '0');
                    formattedDate = `${pad(sDate.getDate())}/${pad(sDate.getMonth() + 1)}/${sDate.getFullYear()}`;
                } else {
                    formattedDate = shift.shift_date; // fallback กรณี parse date ไม่ได้
                }

                shiftsMap[shift.an].push({
                    date: formattedDate,
                    shiftId: shift.shiftId !== null ? Number(shift.shiftId) : null,
                    isVentilator: shift.ventilator_use === 'Y' || shift.ventilator_use === '1' || shift.ventilator_use === true,
                    severityLevel: shift.severityLevel !== null ? Number(shift.severityLevel) : null
                });
            });
        }

        // 5. ประกอบข้อมูลเป็น JSON Format ตามโครงสร้างที่ต้องการ
        const data = patients.map(p => {
            const regDate = p.reg_datetime ? new Date(p.reg_datetime) : null;
            let admitDate = null;
            let admitDateTimeIso = null;

            if (regDate && !isNaN(regDate.getTime())) {
                const pad = (n: number) => n.toString().padStart(2, '0');
                admitDate = `${pad(regDate.getDate())}/${pad(regDate.getMonth() + 1)}/${regDate.getFullYear()}`;
                admitDateTimeIso = `${regDate.getFullYear()}-${pad(regDate.getMonth() + 1)}-${pad(regDate.getDate())}T${pad(regDate.getHours())}:${pad(regDate.getMinutes())}:${pad(regDate.getSeconds())}`;
            }

            return {
                admission_list_id: p.admission_list_id,
                hn: p.hn,
                an: p.an,
                name: p.name ? sanitizeHTML(p.name) : null,
                age: p.age !== null ? Number(p.age) : null,
                ward: p.ward,
                wardName: wardName ? sanitizeHTML(wardName) : p.ward,
                bed: p.bed,
                admitDate,
                admitDateTimeIso,
                spcltyName: p.spcltyName ? sanitizeHTML(p.spcltyName) : null,
                doctorName: p.incharge_doctor && doctorMap[p.incharge_doctor] ? sanitizeHTML(doctorMap[p.incharge_doctor]) : (p.incharge_doctor || null),
                shiftRecords: shiftsMap[p.an] || []
            };
        });

        return {
            success: true,
            data
        };

    } catch (error) {
        console.error('Get patients register by ward error:', error);
        set.status = 500;
        return {
            success: false,
            message: 'Internal Server Error'
        };
    }
};
