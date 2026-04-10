import { Context } from 'elysia';
import { his,nurse } from '../db';
import { RowDataPacket } from 'mysql2';
import { sanitizeHTML } from '../utils/sanitize';

// ฟังก์ชันสำหรับดึงข้อมูลผู้ป่วยตาม ward
export const getPatientsByWard = async ({ body, set }: Context) => {
    const { ward } = body as { ward: string };
    try {
        // ดึง an ที่ลงทะเบียนแล้วใน admission_list (status=1 = ยังแอดมิทอยู่) ward เดียวกัน
        const [registeredRows] = await nurse.execute<RowDataPacket[]>(
            `SELECT an FROM admission_list WHERE ward = ? AND status = '1'`,
            [ward]
        );
        const registeredAns = (registeredRows as RowDataPacket[]).map(r => r.an);

        let rows: RowDataPacket[];
        if (registeredAns.length > 0) {
            const placeholders = registeredAns.map(() => '?').join(',');
            [rows] = await his.execute<RowDataPacket[]>(
                `SELECT i.an, i.hn, i.dchstts, CONCAT(p.pname, p.fname, ' ', p.lname) AS ptname,
                concat(i.regdate,' ',i.regtime) AS regdate, p.birthday, p.sex, a.bedno, d.name AS doctor_name, i.ward
                FROM ipt i
                LEFT JOIN patient p ON p.hn = i.hn
                LEFT JOIN iptadm a ON a.an = i.an
                LEFT JOIN doctor d ON d.code = i.incharge_doctor
                WHERE i.dchstts IS NULL AND i.ward = ? AND i.an NOT IN (${placeholders})
                ORDER BY a.bedno ASC`,
                [ward, ...registeredAns]
            );
        } else {
            [rows] = await his.execute<RowDataPacket[]>(
                `SELECT i.an, i.hn, i.dchstts, CONCAT(p.pname, p.fname, ' ', p.lname) AS ptname,
                concat(i.regdate,' ',i.regtime) AS regdate, p.birthday, p.sex, a.bedno, d.name AS doctor_name, i.ward
                FROM ipt i
                LEFT JOIN patient p ON p.hn = i.hn
                LEFT JOIN iptadm a ON a.an = i.an
                LEFT JOIN doctor d ON d.code = i.incharge_doctor
                WHERE i.dchstts IS NULL AND i.ward = ?
                ORDER BY a.bedno ASC`,
                [ward]
            );
        }

        return {
            success: true,
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

// ฟังก์ชันจำหน่ายผู้ป่วย (discharge / transfer / refer)
export const dischargePatient = async ({ body, set }: Context) => {
    const {
        admission_list_id,
        discharge_type_id,
        discharge_datetime,
        move_to_ward,
        status,
        los,
    } = body as {
        admission_list_id: number;
        discharge_type_id: number;
        discharge_datetime: string;
        move_to_ward: string | null;
        status: string;
        los: number;
    };

    const connection = await nurse.getConnection();
    try {
        const [[existing], [dischargeType]] = await Promise.all([
            connection.execute<RowDataPacket[]>(
                `SELECT admission_list_id FROM admission_list WHERE admission_list_id = ? LIMIT 1`,
                [admission_list_id]
            ),
            connection.execute<RowDataPacket[]>(
                `SELECT discharge_type_name FROM discharge_types WHERE discharge_type_id = ? LIMIT 1`,
                [discharge_type_id]
            ),
        ]);

        if ((existing as RowDataPacket[]).length === 0) {
            set.status = 404;
            return { success: false, message: `ไม่พบข้อมูลผู้ป่วย admission_list_id: ${admission_list_id}` };
        }

        const typeLabel = (dischargeType as RowDataPacket[])[0]?.discharge_type_name ?? 'จำหน่ายผู้ป่วย';

        await connection.beginTransaction();

        await connection.execute(
            `UPDATE admission_list SET
                discharge_type_id = ?,
                discharge_datetime = ?,
                move_to_ward = ?,
                status = ?,
                los = ?
             WHERE admission_list_id = ?`,
            [discharge_type_id, discharge_datetime, move_to_ward ?? null, status, los, admission_list_id]
        );

        await connection.commit();

        return {
            success: true,
            message: `${typeLabel}เรียบร้อยแล้ว`,
            data: { admission_list_id, discharge_type_id, discharge_type_name: typeLabel, status, discharge_datetime, move_to_ward: move_to_ward ?? null, los }
        };

    } catch (error) {
        await connection.rollback();
        console.error('Discharge patient error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error during discharge.' };
    } finally {
        connection.release();
    }
};

// ฟังก์ชันยกเลิกการจำหน่ายผู้ป่วย
export const cancelDischarge = async ({ body, set }: Context) => {
    const { admission_list_id } = body as { admission_list_id: number };

    const connection = await nurse.getConnection();
    try {
        const [existing] = await connection.execute<RowDataPacket[]>(
            `SELECT admission_list_id, status FROM admission_list WHERE admission_list_id = ? LIMIT 1`,
            [admission_list_id]
        );

        if ((existing as RowDataPacket[]).length === 0) {
            set.status = 404;
            return { success: false, message: `ไม่พบข้อมูลผู้ป่วย admission_list_id: ${admission_list_id}` };
        }

        if ((existing as RowDataPacket[])[0].status === '1') {
            set.status = 400;
            return { success: false, message: 'ผู้ป่วยยังไม่ได้ถูกจำหน่าย' };
        }

        await connection.beginTransaction();

        await connection.execute(
            `UPDATE admission_list SET
                status = '1',
                discharge_type_id = 0,
                discharge_datetime = NULL,
                move_to_ward = NULL,
                los = NULL
             WHERE admission_list_id = ?`,
            [admission_list_id]
        );

        await connection.commit();

        return {
            success: true,
            message: 'ยกเลิกการจำหน่ายเรียบร้อยแล้ว',
            data: { admission_list_id, status: '1' }
        };

    } catch (error) {
        await connection.rollback();
        console.error('Cancel discharge error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error during cancel discharge.' };
    } finally {
        connection.release();
    }
};

// ฟังก์ชันดึงรายชื่อผู้ป่วยที่จำหน่ายแล้วตาม ward
export const getPatientDischargeByWard = async ({ body, set }: Context) => {
    const { ward, date_from, date_to } = body as {
        ward: string;
        date_from?: string | null;
        date_to?: string | null;
    };

    try {
        const params: any[] = [ward];
        let dateFilter = '';

        if (date_from && date_to) {
            dateFilter = `AND DATE(al.discharge_datetime) BETWEEN DATE(?) AND DATE(?)`;
            params.push(date_from, date_to);
        } else if (date_from) {
            dateFilter = `AND DATE(al.discharge_datetime) >= DATE(?)`;
            params.push(date_from);
        } else if (date_to) {
            dateFilter = `AND DATE(al.discharge_datetime) <= DATE(?)`;
            params.push(date_to);
        }

        const [rows] = await nurse.execute<RowDataPacket[]>(
            `SELECT
                al.admission_list_id,
                al.an,
                al.hn,
                al.patient_name,
                al.ward,
                al.bedno,
                al.reg_datetime,
                al.discharge_datetime,
                al.move_to_ward,
                al.los,
                al.status,
                dt.discharge_type_name,
                ast.status_name
             FROM admission_list al
             LEFT JOIN discharge_types dt ON dt.discharge_type_id = al.discharge_type_id
             LEFT JOIN admission_statuses ast ON ast.status_code = al.status
             WHERE al.ward = ? AND al.status IN ('2', '3')
             ${dateFilter}
             ORDER BY al.discharge_datetime DESC`,
            params
        );

        return {
            success: true,
            total: rows.length,
            data: rows.map(row => ({
                ...row,
                patient_name: row.patient_name ? sanitizeHTML(row.patient_name) : null,
            }))
        };
    } catch (error) {
        console.error('Get patient discharge by ward error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

// ฟังก์ชันสำหรับดึงข้อมูลผู้ป่วยตาม ward (จากตาราง admission_list)
export const getPatientByward = async ({ params, set }: Context) => {
    const { ward } = params as { ward: string };
    try {
        const sql = `
            SELECT 
                admission_list_id,
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
                status ?? '1',
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
//                 status ?? '1', 
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

// บันทึก/อัพเดทข้อมูลการดูแลผู้ป่วยรายเวร (Upsert)
export const upsertAdmissionShiftDailyRecord = async ({ body, set, user }: Context & { user: any }) => {
    const { admission_list_id, level, admission_shift_care_level_id, shift_type_id, date, hn, an, severity_level_id } = body as {
        admission_list_id: number;
        level?: number | null;
        admission_shift_care_level_id?: number | null;
        shift_type_id: number;
        date: string;
        hn?: string;
        an?: string;
        severity_level_id?: number;
    };

    const careLevelId = admission_shift_care_level_id ?? null;
    const severityLevelId = level ?? severity_level_id ?? null;

    // แปลง DD/MM/YYYY → YYYY-MM-DD
    const parsedDate = date.includes('/')
        ? date.split('/').reverse().join('-')
        : date;

    const recorded_by = user?.id ?? null;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    try {
        const [existing] = await nurse.execute<RowDataPacket[]>(
            `SELECT admission_shift_daily_record FROM admission_shift_daily_record
             WHERE admission_list_id = ? AND shift_type_id = ? AND record_date = ?`,
            [admission_list_id, shift_type_id, parsedDate]
        );

        if (existing.length > 0) {
            await nurse.execute(
                `UPDATE admission_shift_daily_record
                 SET admission_shift_care_level_id = ?, severity_level_id = ?, hn = ?, an = ?, updated_by = ?, updated_at = ?
                 WHERE admission_list_id = ? AND shift_type_id = ? AND record_date = ?`,
                [careLevelId, severityLevelId, hn ?? null, an ?? null, recorded_by, now, admission_list_id, shift_type_id, parsedDate]
            );
            return { success: true, message: 'อัพเดทข้อมูลเรียบร้อยแล้ว' };
        } else {
            await nurse.execute(
                `INSERT INTO admission_shift_daily_record
                 (admission_list_id, shift_type_id, admission_shift_care_level_id, severity_level_id, record_date, hn, an, recorded_by, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [admission_list_id, shift_type_id, careLevelId, severityLevelId, parsedDate, hn ?? null, an ?? null, recorded_by, now]
            );
            return { success: true, message: 'บันทึกข้อมูลเรียบร้อยแล้ว' };
        }
    } catch (error) {
        console.error('Upsert admission shift daily record error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

// คัดลอก shift daily records จากเวร/วันที่ต้นทาง → ปลายทาง (upsert)
export const copyPreviousShiftDailyRecords = async ({ body, set, user }: Context & { user: any }) => {
    const { ward, target_date, target_shift_type_id, source_date, source_shift_type_id } = body as {
        ward: string;
        target_date: string;
        target_shift_type_id: number;
        source_date: string;
        source_shift_type_id: number;
    };

    const parseDate = (d: string) => d.includes('/') ? d.split('/').reverse().join('-') : d;
    const parsedTargetDate = parseDate(target_date);
    const parsedSourceDate = parseDate(source_date);
    const recorded_by = user?.id ?? null;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    try {
        // ดึงข้อมูลต้นทาง (source) เฉพาะ ward นั้น
        const [sourceRows] = await nurse.execute<RowDataPacket[]>(
            `SELECT asdr.admission_list_id, asdr.admission_shift_care_level_id, asdr.severity_level_id, asdr.hn, asdr.an
             FROM admission_shift_daily_record asdr
             JOIN admission_list al ON al.admission_list_id = asdr.admission_list_id
             WHERE al.ward = ? AND al.status = '1' AND asdr.shift_type_id = ? AND asdr.record_date = ?`,
            [ward, source_shift_type_id, parsedSourceDate]
        );

        if (sourceRows.length === 0) {
            return { success: true, message: 'ไม่พบข้อมูลต้นทางที่จะคัดลอก', copied: 0 };
        }

        // upsert ทีละรายการ
        for (const row of sourceRows) {
            const [existing] = await nurse.execute<RowDataPacket[]>(
                `SELECT admission_shift_daily_record FROM admission_shift_daily_record
                 WHERE admission_list_id = ? AND shift_type_id = ? AND record_date = ?`,
                [row.admission_list_id, target_shift_type_id, parsedTargetDate]
            );

            if (existing.length > 0) {
                await nurse.execute(
                    `UPDATE admission_shift_daily_record
                     SET admission_shift_care_level_id = ?, severity_level_id = ?, hn = ?, an = ?, updated_by = ?, updated_at = ?
                     WHERE admission_list_id = ? AND shift_type_id = ? AND record_date = ?`,
                    [row.admission_shift_care_level_id, row.severity_level_id, row.hn, row.an, recorded_by, now,
                     row.admission_list_id, target_shift_type_id, parsedTargetDate]
                );
            } else {
                await nurse.execute(
                    `INSERT INTO admission_shift_daily_record
                     (admission_list_id, shift_type_id, admission_shift_care_level_id, severity_level_id, record_date, hn, an, recorded_by, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [row.admission_list_id, target_shift_type_id, row.admission_shift_care_level_id,
                     row.severity_level_id, parsedTargetDate, row.hn, row.an, recorded_by, now]
                );
            }
        }

        return {
            success: true,
            message: `คัดลอกข้อมูลเรียบร้อยแล้ว จำนวน ${sourceRows.length} รายการ`,
            copied: sourceRows.length
        };
    } catch (error) {
        console.error('Copy previous shift daily records error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

// ดึงข้อมูลผู้ป่วยพร้อม care level และ severity level ของแต่ละเวรตามวันที่
export const getPatientShiftDailyRecordsByWard = async ({ body, set }: Context) => {
    const { ward, date } = body as { ward: string; date: string };

    const parsedDate = date.includes('/')
        ? date.split('/').reverse().join('-')
        : date;

    try {
        const [rows] = await nurse.execute<RowDataPacket[]>(
            `SELECT
                al.admission_list_id,
                al.an,
                al.patient_name,
                (SELECT asdr.admission_shift_care_level_id FROM admission_shift_daily_record asdr
                 WHERE asdr.admission_list_id = al.admission_list_id AND asdr.shift_type_id = 1 AND asdr.record_date = ?) AS night_care_level,
                (SELECT asdr.severity_level_id FROM admission_shift_daily_record asdr
                 WHERE asdr.admission_list_id = al.admission_list_id AND asdr.shift_type_id = 1 AND asdr.record_date = ?) AS night_severity_level,
                (SELECT asdr.admission_shift_care_level_id FROM admission_shift_daily_record asdr
                 WHERE asdr.admission_list_id = al.admission_list_id AND asdr.shift_type_id = 2 AND asdr.record_date = ?) AS morning_care_level,
                (SELECT asdr.severity_level_id FROM admission_shift_daily_record asdr
                 WHERE asdr.admission_list_id = al.admission_list_id AND asdr.shift_type_id = 2 AND asdr.record_date = ?) AS morning_severity_level,
                (SELECT asdr.admission_shift_care_level_id FROM admission_shift_daily_record asdr
                 WHERE asdr.admission_list_id = al.admission_list_id AND asdr.shift_type_id = 3 AND asdr.record_date = ?) AS evening_care_level,
                (SELECT asdr.severity_level_id FROM admission_shift_daily_record asdr
                 WHERE asdr.admission_list_id = al.admission_list_id AND asdr.shift_type_id = 3 AND asdr.record_date = ?) AS evening_severity_level
            FROM admission_list al
            WHERE al.ward = ? AND al.status = '1'`,
            [parsedDate, parsedDate, parsedDate, parsedDate, parsedDate, parsedDate, ward]
        );

        return {
            success: true,
            data: rows.map(row => ({
                ...row,
                patient_name: sanitizeHTML(row.patient_name)
            }))
        };
    } catch (error) {
        console.error('Get patient shift daily records by ward error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

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
        // ค้นหาด้วย 4 ฟิลด์: admission_list_id + admission_change_shift_type_id + shift_date + ward
        const [existing] = await nurse.execute<RowDataPacket[]>(
            `SELECT admission_change_shift_id FROM admission_change_shift
             WHERE admission_list_id = ?
               AND admission_change_shift_type_id = ?
               AND DATE(shift_date) = DATE(?)
               AND ward = ?
             LIMIT 1`,
            [admission_list_id, admission_change_shift_type_id, shift_date, ward]
        );

        let result: any;
        let action: string;

        if (existing.length > 0) {
            // UPDATE ข้อมูลเดิม
            const existingId = existing[0].admission_change_shift_id;
            [result] = await nurse.execute(
                `UPDATE admission_change_shift SET
                    staff = ?, severity_level_id = ?, ventilator_use = ?,
                    level_of_care = ?, pain_score = ?, fall_risk = ?, pressure_sore_risk = ?,
                    gcs_eye = ?, gcs_verbal = ?, gcs_motor = ?, oxygen_support_type_id = ?,
                    safety_precautions = ?, comment = ?,
                    update_datetime = NOW(), update_by = ?
                 WHERE admission_change_shift_id = ?`,
                [
                    safeStaff, severity_level_id, safeVentilatorUse,
                    safeLevelOfCare, safePainScore, safeFallRisk, safePressureSoreRisk,
                    safeGcsEye, safeGcsVerbal, safeGcsMotor, safeOxygenSupportTypeId,
                    safeSafetyPrecautions, safeComment,
                    safeStaff, existingId
                ]
            );
            action = 'updated';
            result.insertId = existingId;
        } else {
            // INSERT ใหม่
            [result] = await nurse.execute(
                `INSERT INTO admission_change_shift (
                    admission_list_id, admission_change_shift_type_id,
                    an, hn, ward, shift_date, staff,
                    severity_level_id, ventilator_use,
                    level_of_care, pain_score, fall_risk, pressure_sore_risk,
                    gcs_eye, gcs_verbal, gcs_motor, oxygen_support_type_id,
                    safety_precautions, comment, create_datetime
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [
                    admission_list_id, admission_change_shift_type_id,
                    an, hn, ward, shift_date, safeStaff,
                    severity_level_id, safeVentilatorUse,
                    safeLevelOfCare, safePainScore, safeFallRisk, safePressureSoreRisk,
                    safeGcsEye, safeGcsVerbal, safeGcsMotor, safeOxygenSupportTypeId,
                    safeSafetyPrecautions, safeComment
                ]
            );
            action = 'created';
        }

        return {
            success: true,
            message: action === 'created'
                ? 'บันทึกข้อมูลอาการผู้ป่วยรายเวรเรียบร้อยแล้ว'
                : 'อัพเดทข้อมูลอาการผู้ป่วยรายเวรเรียบร้อยแล้ว',
            admission_change_shift_id: result.insertId,
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
            WHERE al.ward = ? AND al.status = '1'
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
                    isVentilator: shift.ventilator_use ?? null,
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
