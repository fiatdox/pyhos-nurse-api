import { nurse } from '../db';
import { sanitizeHTML } from '../utils/sanitize';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

// ============================================================
// 1. การบันทึกการรับผู้ป่วย (Admit Record)
// ============================================================

export const getAdmitRecord = async ({ params, set }: any) => {
    try {
        const { an } = params;
        const [rows] = await nurse.execute<RowDataPacket[]>(
            `SELECT * FROM nursing_admit_records WHERE an = ? AND is_deleted = 0 ORDER BY record_datetime DESC`,
            [an]
        );
        return { success: true, data: rows };
    } catch (error) {
        console.error('getAdmitRecord error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

export const upsertAdmitRecord = async ({ body, set }: any) => {
    try {
        const {
            an, ward_code, ward_name, staff_id, nurse_name, record_datetime,
            admit_from, admit_method, admit_reason, chief_complaint, present_illness,
            past_illness, allergies, current_medications, general_appearance, skin_condition,
            mobility, communication, religion, occupation, vital_t, vital_p, vital_r,
            vital_bp, vital_o2sat, consciousness, pain_score, nutrition_screening,
            weight, height, bmi, diagnosis_summary, treatment_summary,
            caregiver_name, caregiver_relation, caregiver_phone,
            nursing_diagnosis, nursing_plan
        } = body;

        const [existing] = await nurse.execute<RowDataPacket[]>(
            `SELECT id FROM nursing_admit_records WHERE an = ? AND is_deleted = 0 LIMIT 1`, [an]
        );

        const values = [
            ward_code, sanitizeHTML(ward_name), staff_id, sanitizeHTML(nurse_name), record_datetime,
            admit_from, admit_method, sanitizeHTML(admit_reason), sanitizeHTML(chief_complaint), sanitizeHTML(present_illness),
            sanitizeHTML(past_illness), sanitizeHTML(allergies), sanitizeHTML(current_medications), general_appearance, skin_condition,
            mobility, communication, religion, sanitizeHTML(occupation), vital_t, vital_p, vital_r,
            sanitizeHTML(vital_bp), vital_o2sat, consciousness, pain_score, nutrition_screening,
            weight, height, bmi, sanitizeHTML(diagnosis_summary), sanitizeHTML(treatment_summary),
            sanitizeHTML(caregiver_name), sanitizeHTML(caregiver_relation), sanitizeHTML(caregiver_phone),
            sanitizeHTML(nursing_diagnosis), sanitizeHTML(nursing_plan), staff_id
        ];

        if ((existing as RowDataPacket[]).length > 0) {
            const id = (existing as RowDataPacket[])[0].id;
            await nurse.execute(
                `UPDATE nursing_admit_records SET
                    ward_code=?, ward_name=?, staff_id=?, nurse_name=?, record_datetime=?,
                    admit_from=?, admit_method=?, admit_reason=?, chief_complaint=?, present_illness=?,
                    past_illness=?, allergies=?, current_medications=?, general_appearance=?, skin_condition=?,
                    mobility=?, communication=?, religion=?, occupation=?, vital_t=?, vital_p=?, vital_r=?,
                    vital_bp=?, vital_o2sat=?, consciousness=?, pain_score=?, nutrition_screening=?,
                    weight=?, height=?, bmi=?, diagnosis_summary=?, treatment_summary=?,
                    caregiver_name=?, caregiver_relation=?, caregiver_phone=?,
                    nursing_diagnosis=?, nursing_plan=?, updated_by=?
                WHERE id = ? AND is_deleted = 0`,
                [...values, id]
            );
            return { success: true, message: 'Admit record updated', data: { id } };
        }

        const [result] = await nurse.execute<ResultSetHeader>(
            `INSERT INTO nursing_admit_records (
                an, ward_code, ward_name, staff_id, nurse_name, record_datetime,
                admit_from, admit_method, admit_reason, chief_complaint, present_illness,
                past_illness, allergies, current_medications, general_appearance, skin_condition,
                mobility, communication, religion, occupation, vital_t, vital_p, vital_r,
                vital_bp, vital_o2sat, consciousness, pain_score, nutrition_screening,
                weight, height, bmi, diagnosis_summary, treatment_summary,
                caregiver_name, caregiver_relation, caregiver_phone,
                nursing_diagnosis, nursing_plan, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [an, ...values]
        );
        return { success: true, message: 'Admit record created', data: { id: result.insertId } };
    } catch (error) {
        console.error('upsertAdmitRecord error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

// ============================================================
// 2. แบบบันทึกสัญญาณชีพ (Vital Signs Record)
// ============================================================

export const getVitalRecords = async ({ params, set }: any) => {
    try {
        const { an } = params;
        const [rows] = await nurse.execute<RowDataPacket[]>(
            `SELECT * FROM nursing_vital_records WHERE an = ? AND is_deleted = 0 ORDER BY record_datetime DESC`,
            [an]
        );
        return { success: true, data: rows };
    } catch (error) {
        console.error('getVitalRecords error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

export const upsertVitalRecord = async ({ body, set }: any) => {
    try {
        const {
            id, an, ward_code, ward_name, staff_id, nurse_name, record_datetime,
            vital_t, vital_p, vital_r, vital_bp_s, vital_bp_d, vital_o2sat,
            pain_score, consciousness
        } = body;

        if (id) {
            await nurse.execute(
                `UPDATE nursing_vital_records SET
                    ward_code=?, ward_name=?, staff_id=?, nurse_name=?, record_datetime=?,
                    vital_t=?, vital_p=?, vital_r=?, vital_bp_s=?, vital_bp_d=?, vital_o2sat=?,
                    pain_score=?, consciousness=?, updated_by=?
                WHERE id = ? AND is_deleted = 0`,
                [
                    ward_code, sanitizeHTML(ward_name), staff_id, sanitizeHTML(nurse_name), record_datetime,
                    vital_t, vital_p, vital_r, vital_bp_s, vital_bp_d, vital_o2sat,
                    pain_score, consciousness, staff_id, id
                ]
            );
            return { success: true, message: 'Vital record updated', data: { id } };
        }

        const [result] = await nurse.execute<ResultSetHeader>(
            `INSERT INTO nursing_vital_records (
                an, ward_code, ward_name, staff_id, nurse_name, record_datetime,
                vital_t, vital_p, vital_r, vital_bp_s, vital_bp_d, vital_o2sat,
                pain_score, consciousness, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                an, ward_code, sanitizeHTML(ward_name), staff_id, sanitizeHTML(nurse_name), record_datetime,
                vital_t, vital_p, vital_r, vital_bp_s, vital_bp_d, vital_o2sat,
                pain_score, consciousness, staff_id
            ]
        );
        return { success: true, message: 'Vital record created', data: { id: result.insertId } };
    } catch (error) {
        console.error('upsertVitalRecord error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

export const deleteVitalRecord = async ({ params, set }: any) => {
    try {
        const id = Number(params.id);
        await nurse.execute(`UPDATE nursing_vital_records SET is_deleted = 1 WHERE id = ?`, [id]);
        return { success: true, message: 'Record deleted successfully' };
    } catch (error) {
        console.error('deleteVitalRecord error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

// ============================================================
// 3. บันทึกทางการพยาบาล (Nursing Progress Notes)
// ============================================================

export const getNursingNotes = async ({ params, set }: any) => {
    try {
        const { an } = params;
        const [rows] = await nurse.execute<RowDataPacket[]>(
            `SELECT * FROM nursing_progress_notes WHERE an = ? AND is_deleted = 0 ORDER BY record_datetime DESC`,
            [an]
        );
        return { success: true, data: rows };
    } catch (error) {
        console.error('getNursingNotes error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

export const upsertNursingNote = async ({ body, set }: any) => {
    try {
        const {
            id, an, ward_code, ward_name, staff_id, nurse_name, record_datetime,
            shift, focus, note_type, subjective, objective, assessment,
            intervention, plan, evaluation
        } = body;

        if (id) {
            await nurse.execute(
                `UPDATE nursing_progress_notes SET
                    ward_code=?, ward_name=?, staff_id=?, nurse_name=?, record_datetime=?,
                    shift=?, focus=?, note_type=?, subjective=?, objective=?, assessment=?,
                    intervention=?, plan=?, evaluation=?, updated_by=?
                WHERE id = ? AND is_deleted = 0`,
                [
                    ward_code, sanitizeHTML(ward_name), staff_id, sanitizeHTML(nurse_name), record_datetime,
                    shift, sanitizeHTML(focus), note_type, sanitizeHTML(subjective), sanitizeHTML(objective),
                    sanitizeHTML(assessment), sanitizeHTML(intervention), sanitizeHTML(plan),
                    sanitizeHTML(evaluation), staff_id, id
                ]
            );
            return { success: true, message: 'Nursing note updated', data: { id } };
        }

        const [result] = await nurse.execute<ResultSetHeader>(
            `INSERT INTO nursing_progress_notes (
                an, ward_code, ward_name, staff_id, nurse_name, record_datetime,
                shift, focus, note_type, subjective, objective, assessment,
                intervention, plan, evaluation, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                an, ward_code, sanitizeHTML(ward_name), staff_id, sanitizeHTML(nurse_name), record_datetime,
                shift, sanitizeHTML(focus), note_type, sanitizeHTML(subjective), sanitizeHTML(objective),
                sanitizeHTML(assessment), sanitizeHTML(intervention), sanitizeHTML(plan),
                sanitizeHTML(evaluation), staff_id
            ]
        );
        return { success: true, message: 'Nursing note created', data: { id: result.insertId } };
    } catch (error) {
        console.error('upsertNursingNote error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

export const deleteNursingNote = async ({ params, set }: any) => {
    try {
        const id = Number(params.id);
        await nurse.execute(`UPDATE nursing_progress_notes SET is_deleted = 1 WHERE id = ?`, [id]);
        return { success: true, message: 'Record deleted successfully' };
    } catch (error) {
        console.error('deleteNursingNote error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

// ============================================================
// 4. แผนการพยาบาล (Nursing Care Plan)
// ============================================================

export const getCarePlans = async ({ params, set }: any) => {
    try {
        const { an } = params;
        const [rows] = await nurse.execute<RowDataPacket[]>(
            `SELECT * FROM nursing_care_plans WHERE an = ? AND is_deleted = 0 ORDER BY start_date DESC`,
            [an]
        );
        return { success: true, data: rows };
    } catch (error) {
        console.error('getCarePlans error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

export const upsertCarePlan = async ({ body, set }: any) => {
    try {
        const {
            id, an, ward_code, ward_name, staff_id, nurse_name, start_date, priority,
            nursing_diagnosis, related_to, goal, expected_outcome, interventions,
            evaluation, evaluation_date, status
        } = body;

        if (id) {
            await nurse.execute(
                `UPDATE nursing_care_plans SET
                    ward_code=?, ward_name=?, staff_id=?, nurse_name=?, start_date=?, priority=?,
                    nursing_diagnosis=?, related_to=?, goal=?, expected_outcome=?, interventions=?,
                    evaluation=?, evaluation_date=?, status=?, updated_by=?
                WHERE id = ? AND is_deleted = 0`,
                [
                    ward_code, sanitizeHTML(ward_name), staff_id, sanitizeHTML(nurse_name), start_date, priority,
                    sanitizeHTML(nursing_diagnosis), sanitizeHTML(related_to), sanitizeHTML(goal),
                    sanitizeHTML(expected_outcome), sanitizeHTML(interventions),
                    sanitizeHTML(evaluation), evaluation_date, status, staff_id, id
                ]
            );
            return { success: true, message: 'Care plan updated', data: { id } };
        }

        const [result] = await nurse.execute<ResultSetHeader>(
            `INSERT INTO nursing_care_plans (
                an, ward_code, ward_name, staff_id, nurse_name, start_date, priority,
                nursing_diagnosis, related_to, goal, expected_outcome, interventions,
                evaluation, evaluation_date, status, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                an, ward_code, sanitizeHTML(ward_name), staff_id, sanitizeHTML(nurse_name), start_date, priority,
                sanitizeHTML(nursing_diagnosis), sanitizeHTML(related_to), sanitizeHTML(goal),
                sanitizeHTML(expected_outcome), sanitizeHTML(interventions),
                sanitizeHTML(evaluation), evaluation_date, status ?? 'active', staff_id
            ]
        );
        return { success: true, message: 'Care plan created', data: { id: result.insertId } };
    } catch (error) {
        console.error('upsertCarePlan error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

export const deleteCarePlan = async ({ params, set }: any) => {
    try {
        const id = Number(params.id);
        await nurse.execute(`UPDATE nursing_care_plans SET is_deleted = 1 WHERE id = ?`, [id]);
        return { success: true, message: 'Record deleted successfully' };
    } catch (error) {
        console.error('deleteCarePlan error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

// ============================================================
// 5. บันทึกการได้รับและขับออกของสารน้ำ (I/O Record)
// ============================================================

export const getIORecords = async ({ params, set }: any) => {
    try {
        const { an } = params;
        const [rows] = await nurse.execute<RowDataPacket[]>(
            `SELECT * FROM nursing_io_records WHERE an = ? AND is_deleted = 0 ORDER BY record_datetime DESC`,
            [an]
        );
        return { success: true, data: rows };
    } catch (error) {
        console.error('getIORecords error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

export const upsertIORecord = async ({ body, set }: any) => {
    try {
        const {
            id, an, ward_code, ward_name, staff_id, nurse_name, record_datetime,
            shift, io_type, category, item_name, amount, unit, route, note
        } = body;

        if (id) {
            await nurse.execute(
                `UPDATE nursing_io_records SET
                    ward_code=?, ward_name=?, staff_id=?, nurse_name=?, record_datetime=?,
                    shift=?, io_type=?, category=?, item_name=?, amount=?, unit=?, route=?, note=?, updated_by=?
                WHERE id = ? AND is_deleted = 0`,
                [
                    ward_code, sanitizeHTML(ward_name), staff_id, sanitizeHTML(nurse_name), record_datetime,
                    shift, io_type, sanitizeHTML(category), sanitizeHTML(item_name), amount, unit, route,
                    sanitizeHTML(note), staff_id, id
                ]
            );
            return { success: true, message: 'I/O record updated', data: { id } };
        }

        const [result] = await nurse.execute<ResultSetHeader>(
            `INSERT INTO nursing_io_records (
                an, ward_code, ward_name, staff_id, nurse_name, record_datetime,
                shift, io_type, category, item_name, amount, unit, route, note, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                an, ward_code, sanitizeHTML(ward_name), staff_id, sanitizeHTML(nurse_name), record_datetime,
                shift, io_type, sanitizeHTML(category), sanitizeHTML(item_name), amount, unit, route,
                sanitizeHTML(note), staff_id
            ]
        );
        return { success: true, message: 'I/O record created', data: { id: result.insertId } };
    } catch (error) {
        console.error('upsertIORecord error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

export const deleteIORecord = async ({ params, set }: any) => {
    try {
        const id = Number(params.id);
        await nurse.execute(`UPDATE nursing_io_records SET is_deleted = 1 WHERE id = ?`, [id]);
        return { success: true, message: 'Record deleted successfully' };
    } catch (error) {
        console.error('deleteIORecord error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

// ============================================================
// 6. บันทึกการให้ยา (Medication Administration Record - MAR)
// ============================================================

export const getMedicationOrders = async ({ params, set }: any) => {
    try {
        const { an } = params;
        const [rows] = await nurse.execute<RowDataPacket[]>(
            `SELECT * FROM nursing_medication_orders WHERE an = ? AND is_deleted = 0 ORDER BY order_datetime DESC`,
            [an]
        );
        return { success: true, data: rows };
    } catch (error) {
        console.error('getMedicationOrders error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

export const getMedicationAdmins = async ({ params, set }: any) => {
    try {
        const { an } = params;
        const [rows] = await nurse.execute<RowDataPacket[]>(
            `SELECT ma.*, mo.generic_name, mo.frequency, mo.prn
             FROM nursing_medication_admins ma
             LEFT JOIN nursing_medication_orders mo ON ma.order_id = mo.id
             WHERE ma.an = ? AND ma.is_deleted = 0
             ORDER BY ma.admin_datetime DESC`,
            [an]
        );
        return { success: true, data: rows };
    } catch (error) {
        console.error('getMedicationAdmins error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

export const upsertMedicationAdmin = async ({ body, set }: any) => {
    try {
        const {
            id, order_id, an, ward_code, ward_name, staff_id, nurse_name,
            admin_datetime, shift, medication_name, dose_given, route,
            site, status, held_reason, note
        } = body;

        if (id) {
            await nurse.execute(
                `UPDATE nursing_medication_admins SET
                    order_id=?, ward_code=?, ward_name=?, staff_id=?, nurse_name=?,
                    admin_datetime=?, shift=?, medication_name=?, dose_given=?, route=?,
                    site=?, status=?, held_reason=?, note=?, updated_by=?
                WHERE id = ? AND is_deleted = 0`,
                [
                    order_id, ward_code, sanitizeHTML(ward_name), staff_id, sanitizeHTML(nurse_name),
                    admin_datetime, shift, sanitizeHTML(medication_name), sanitizeHTML(dose_given), route,
                    sanitizeHTML(site), status, sanitizeHTML(held_reason), sanitizeHTML(note), staff_id, id
                ]
            );
            return { success: true, message: 'Medication admin record updated', data: { id } };
        }

        const [result] = await nurse.execute<ResultSetHeader>(
            `INSERT INTO nursing_medication_admins (
                order_id, an, ward_code, ward_name, staff_id, nurse_name,
                admin_datetime, shift, medication_name, dose_given, route,
                site, status, held_reason, note, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                order_id, an, ward_code, sanitizeHTML(ward_name), staff_id, sanitizeHTML(nurse_name),
                admin_datetime, shift, sanitizeHTML(medication_name), sanitizeHTML(dose_given), route,
                sanitizeHTML(site), status, sanitizeHTML(held_reason), sanitizeHTML(note), staff_id
            ]
        );
        return { success: true, message: 'Medication admin record created', data: { id: result.insertId } };
    } catch (error) {
        console.error('upsertMedicationAdmin error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

export const deleteMedicationAdmin = async ({ params, set }: any) => {
    try {
        const id = Number(params.id);
        await nurse.execute(`UPDATE nursing_medication_admins SET is_deleted = 1 WHERE id = ?`, [id]);
        return { success: true, message: 'Record deleted successfully' };
    } catch (error) {
        console.error('deleteMedicationAdmin error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

// ============================================================
// 7. บันทึกการดูแลพิเศษ (Special Care Records)
// ============================================================

export const getSpecialCareRecords = async ({ params, set }: any) => {
    try {
        const { an } = params;
        const [rows] = await nurse.execute<RowDataPacket[]>(
            `SELECT * FROM nursing_special_care_records WHERE an = ? AND is_deleted = 0 ORDER BY record_datetime DESC`,
            [an]
        );
        return { success: true, data: rows };
    } catch (error) {
        console.error('getSpecialCareRecords error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

export const upsertSpecialCareRecord = async ({ body, set }: any) => {
    try {
        const {
            id, an, ward_code, ward_name, staff_id, nurse_name, record_datetime,
            shift, care_type, care_detail, procedure_done, patient_response,
            complications, equipment_used, next_plan
        } = body;

        if (id) {
            await nurse.execute(
                `UPDATE nursing_special_care_records SET
                    ward_code=?, ward_name=?, staff_id=?, nurse_name=?, record_datetime=?,
                    shift=?, care_type=?, care_detail=?, procedure_done=?, patient_response=?,
                    complications=?, equipment_used=?, next_plan=?, updated_by=?
                WHERE id = ? AND is_deleted = 0`,
                [
                    ward_code, sanitizeHTML(ward_name), staff_id, sanitizeHTML(nurse_name), record_datetime,
                    shift, sanitizeHTML(care_type), sanitizeHTML(care_detail), sanitizeHTML(procedure_done),
                    sanitizeHTML(patient_response), sanitizeHTML(complications), sanitizeHTML(equipment_used),
                    sanitizeHTML(next_plan), staff_id, id
                ]
            );
            return { success: true, message: 'Special care record updated', data: { id } };
        }

        const [result] = await nurse.execute<ResultSetHeader>(
            `INSERT INTO nursing_special_care_records (
                an, ward_code, ward_name, staff_id, nurse_name, record_datetime,
                shift, care_type, care_detail, procedure_done, patient_response,
                complications, equipment_used, next_plan, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                an, ward_code, sanitizeHTML(ward_name), staff_id, sanitizeHTML(nurse_name), record_datetime,
                shift, sanitizeHTML(care_type), sanitizeHTML(care_detail), sanitizeHTML(procedure_done),
                sanitizeHTML(patient_response), sanitizeHTML(complications), sanitizeHTML(equipment_used),
                sanitizeHTML(next_plan), staff_id
            ]
        );
        return { success: true, message: 'Special care record created', data: { id: result.insertId } };
    } catch (error) {
        console.error('upsertSpecialCareRecord error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

export const deleteSpecialCareRecord = async ({ params, set }: any) => {
    try {
        const id = Number(params.id);
        await nurse.execute(`UPDATE nursing_special_care_records SET is_deleted = 1 WHERE id = ?`, [id]);
        return { success: true, message: 'Record deleted successfully' };
    } catch (error) {
        console.error('deleteSpecialCareRecord error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

// ============================================================
// 8. บันทึกการศึกษาและให้ความรู้ (Patient Education)
// ============================================================

export const getEducationRecords = async ({ params, set }: any) => {
    try {
        const { an } = params;
        const [rows] = await nurse.execute<RowDataPacket[]>(
            `SELECT * FROM nursing_education_records WHERE an = ? AND is_deleted = 0 ORDER BY record_datetime DESC`,
            [an]
        );
        return { success: true, data: rows };
    } catch (error) {
        console.error('getEducationRecords error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

export const upsertEducationRecord = async ({ body, set }: any) => {
    try {
        const {
            id, an, ward_code, ward_name, staff_id, nurse_name, record_datetime,
            shift, category, topic, target_audience, teaching_method, content_taught,
            materials_used, learner_response, understanding_level, barriers, follow_up_plan
        } = body;

        if (id) {
            await nurse.execute(
                `UPDATE nursing_education_records SET
                    ward_code=?, ward_name=?, staff_id=?, nurse_name=?, record_datetime=?,
                    shift=?, category=?, topic=?, target_audience=?, teaching_method=?,
                    content_taught=?, materials_used=?, learner_response=?, understanding_level=?,
                    barriers=?, follow_up_plan=?, updated_by=?
                WHERE id = ? AND is_deleted = 0`,
                [
                    ward_code, sanitizeHTML(ward_name), staff_id, sanitizeHTML(nurse_name), record_datetime,
                    shift, sanitizeHTML(category), sanitizeHTML(topic), sanitizeHTML(target_audience),
                    sanitizeHTML(teaching_method), sanitizeHTML(content_taught), sanitizeHTML(materials_used),
                    sanitizeHTML(learner_response), understanding_level, sanitizeHTML(barriers),
                    sanitizeHTML(follow_up_plan), staff_id, id
                ]
            );
            return { success: true, message: 'Education record updated', data: { id } };
        }

        const [result] = await nurse.execute<ResultSetHeader>(
            `INSERT INTO nursing_education_records (
                an, ward_code, ward_name, staff_id, nurse_name, record_datetime,
                shift, category, topic, target_audience, teaching_method, content_taught,
                materials_used, learner_response, understanding_level, barriers, follow_up_plan, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                an, ward_code, sanitizeHTML(ward_name), staff_id, sanitizeHTML(nurse_name), record_datetime,
                shift, sanitizeHTML(category), sanitizeHTML(topic), sanitizeHTML(target_audience),
                sanitizeHTML(teaching_method), sanitizeHTML(content_taught), sanitizeHTML(materials_used),
                sanitizeHTML(learner_response), understanding_level, sanitizeHTML(barriers),
                sanitizeHTML(follow_up_plan), staff_id
            ]
        );
        return { success: true, message: 'Education record created', data: { id: result.insertId } };
    } catch (error) {
        console.error('upsertEducationRecord error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

export const deleteEducationRecord = async ({ params, set }: any) => {
    try {
        const id = Number(params.id);
        await nurse.execute(`UPDATE nursing_education_records SET is_deleted = 1 WHERE id = ?`, [id]);
        return { success: true, message: 'Record deleted successfully' };
    } catch (error) {
        console.error('deleteEducationRecord error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

// ============================================================
// 9. บันทึกการส่งเวร (Nursing Handover / SBAR)
// ============================================================

export const getHandoverRecords = async ({ params, set }: any) => {
    try {
        const { an } = params;
        const [rows] = await nurse.execute<RowDataPacket[]>(
            `SELECT * FROM nursing_handover_records WHERE an = ? AND is_deleted = 0 ORDER BY handover_datetime DESC`,
            [an]
        );
        return { success: true, data: rows };
    } catch (error) {
        console.error('getHandoverRecords error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

export const upsertHandoverRecord = async ({ body, set }: any) => {
    try {
        const {
            id, an, ward_code, ward_name, staff_id, nurse_name, handover_datetime,
            shift_from, shift_to, nurse_from, nurse_to, situation, background,
            assessment, recommendation, pending_orders, pending_labs,
            iv_fluid_status, diet, activity, safety_concerns, family_issues
        } = body;

        if (id) {
            await nurse.execute(
                `UPDATE nursing_handover_records SET
                    ward_code=?, ward_name=?, staff_id=?, nurse_name=?, handover_datetime=?,
                    shift_from=?, shift_to=?, nurse_from=?, nurse_to=?, situation=?, background=?,
                    assessment=?, recommendation=?, pending_orders=?, pending_labs=?,
                    iv_fluid_status=?, diet=?, activity=?, safety_concerns=?, family_issues=?, updated_by=?
                WHERE id = ? AND is_deleted = 0`,
                [
                    ward_code, sanitizeHTML(ward_name), staff_id, sanitizeHTML(nurse_name), handover_datetime,
                    shift_from, shift_to, sanitizeHTML(nurse_from), sanitizeHTML(nurse_to),
                    sanitizeHTML(situation), sanitizeHTML(background), sanitizeHTML(assessment),
                    sanitizeHTML(recommendation), sanitizeHTML(pending_orders), sanitizeHTML(pending_labs),
                    sanitizeHTML(iv_fluid_status), sanitizeHTML(diet), sanitizeHTML(activity),
                    sanitizeHTML(safety_concerns), sanitizeHTML(family_issues), staff_id, id
                ]
            );
            return { success: true, message: 'Handover record updated', data: { id } };
        }

        const [result] = await nurse.execute<ResultSetHeader>(
            `INSERT INTO nursing_handover_records (
                an, ward_code, ward_name, staff_id, nurse_name, handover_datetime,
                shift_from, shift_to, nurse_from, nurse_to, situation, background,
                assessment, recommendation, pending_orders, pending_labs,
                iv_fluid_status, diet, activity, safety_concerns, family_issues, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                an, ward_code, sanitizeHTML(ward_name), staff_id, sanitizeHTML(nurse_name), handover_datetime,
                shift_from, shift_to, sanitizeHTML(nurse_from), sanitizeHTML(nurse_to),
                sanitizeHTML(situation), sanitizeHTML(background), sanitizeHTML(assessment),
                sanitizeHTML(recommendation), sanitizeHTML(pending_orders), sanitizeHTML(pending_labs),
                sanitizeHTML(iv_fluid_status), sanitizeHTML(diet), sanitizeHTML(activity),
                sanitizeHTML(safety_concerns), sanitizeHTML(family_issues), staff_id
            ]
        );
        return { success: true, message: 'Handover record created', data: { id: result.insertId } };
    } catch (error) {
        console.error('upsertHandoverRecord error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

export const deleteHandoverRecord = async ({ params, set }: any) => {
    try {
        const id = Number(params.id);
        await nurse.execute(`UPDATE nursing_handover_records SET is_deleted = 1 WHERE id = ?`, [id]);
        return { success: true, message: 'Record deleted successfully' };
    } catch (error) {
        console.error('deleteHandoverRecord error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

// ============================================================
// 10. บันทึกการจำหน่าย (Discharge Record)
// ============================================================

export const getDischargeRecord = async ({ params, set }: any) => {
    try {
        const { an } = params;
        const [rows] = await nurse.execute<RowDataPacket[]>(
            `SELECT * FROM nursing_discharge_records WHERE an = ? AND is_deleted = 0 ORDER BY record_datetime DESC`,
            [an]
        );
        return { success: true, data: rows };
    } catch (error) {
        console.error('getDischargeRecord error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

export const upsertDischargeRecord = async ({ body, set }: any) => {
    try {
        const {
            an, ward_code, ward_name, staff_id, nurse_name, record_datetime,
            discharge_datetime, discharge_type, discharge_condition,
            vital_t, vital_p, vital_r, vital_bp, vital_o2sat,
            diagnosis_summary, treatment_summary, procedure_done,
            medication_instructions, diet_instructions, activity_instructions,
            wound_care_instructions, warning_signs, follow_up_appointment,
            education_completed, medication_provided, documents_given,
            transportation_arranged, referral_arranged, discharged_with,
            caregiver_name, caregiver_phone, discharge_destination
        } = body;

        const values = [
            ward_code, sanitizeHTML(ward_name), staff_id, sanitizeHTML(nurse_name), record_datetime,
            discharge_datetime, discharge_type, discharge_condition,
            vital_t, vital_p, vital_r, sanitizeHTML(vital_bp), vital_o2sat,
            sanitizeHTML(diagnosis_summary), sanitizeHTML(treatment_summary), sanitizeHTML(procedure_done),
            sanitizeHTML(medication_instructions), sanitizeHTML(diet_instructions), sanitizeHTML(activity_instructions),
            sanitizeHTML(wound_care_instructions), sanitizeHTML(warning_signs), sanitizeHTML(follow_up_appointment),
            education_completed ?? 0, medication_provided ?? 0, documents_given ?? 0,
            transportation_arranged ?? 0, referral_arranged ?? 0, discharged_with,
            sanitizeHTML(caregiver_name), sanitizeHTML(caregiver_phone), sanitizeHTML(discharge_destination), staff_id
        ];

        const [existing] = await nurse.execute<RowDataPacket[]>(
            `SELECT id FROM nursing_discharge_records WHERE an = ? AND is_deleted = 0 LIMIT 1`, [an]
        );

        if ((existing as RowDataPacket[]).length > 0) {
            const id = (existing as RowDataPacket[])[0].id;
            await nurse.execute(
                `UPDATE nursing_discharge_records SET
                    ward_code=?, ward_name=?, staff_id=?, nurse_name=?, record_datetime=?,
                    discharge_datetime=?, discharge_type=?, discharge_condition=?,
                    vital_t=?, vital_p=?, vital_r=?, vital_bp=?, vital_o2sat=?,
                    diagnosis_summary=?, treatment_summary=?, procedure_done=?,
                    medication_instructions=?, diet_instructions=?, activity_instructions=?,
                    wound_care_instructions=?, warning_signs=?, follow_up_appointment=?,
                    education_completed=?, medication_provided=?, documents_given=?,
                    transportation_arranged=?, referral_arranged=?, discharged_with=?,
                    caregiver_name=?, caregiver_phone=?, discharge_destination=?, updated_by=?
                WHERE id = ? AND is_deleted = 0`,
                [...values, id]
            );
            return { success: true, message: 'Discharge record updated', data: { id } };
        }

        const [result] = await nurse.execute<ResultSetHeader>(
            `INSERT INTO nursing_discharge_records (
                an, ward_code, ward_name, staff_id, nurse_name, record_datetime,
                discharge_datetime, discharge_type, discharge_condition,
                vital_t, vital_p, vital_r, vital_bp, vital_o2sat,
                diagnosis_summary, treatment_summary, procedure_done,
                medication_instructions, diet_instructions, activity_instructions,
                wound_care_instructions, warning_signs, follow_up_appointment,
                education_completed, medication_provided, documents_given,
                transportation_arranged, referral_arranged, discharged_with,
                caregiver_name, caregiver_phone, discharge_destination, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [an, ...values]
        );
        return { success: true, message: 'Discharge record created', data: { id: result.insertId } };
    } catch (error) {
        console.error('upsertDischargeRecord error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

// ============================================================
// 11. แบบประเมินความเสี่ยงพลัดตกหกล้ม (Fall Risk - Morse Fall Scale)
// ============================================================

export const getFallRiskRecords = async ({ params, set }: any) => {
    try {
        const { an } = params;
        const [rows] = await nurse.execute<RowDataPacket[]>(
            `SELECT * FROM nursing_fall_risk_records WHERE an = ? AND is_deleted = 0 ORDER BY record_datetime DESC`,
            [an]
        );
        return { success: true, data: rows };
    } catch (error) {
        console.error('getFallRiskRecords error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

export const upsertFallRiskRecord = async ({ body, set }: any) => {
    try {
        const {
            id, an, ward_code, ward_name, staff_id, nurse_name, record_datetime,
            shift, history_of_falling, secondary_diagnosis, ambulatory_aid,
            iv_heparin_lock, gait, mental_status, total_score, risk_level, interventions
        } = body;

        if (id) {
            await nurse.execute(
                `UPDATE nursing_fall_risk_records SET
                    ward_code=?, ward_name=?, staff_id=?, nurse_name=?, record_datetime=?,
                    shift=?, history_of_falling=?, secondary_diagnosis=?, ambulatory_aid=?,
                    iv_heparin_lock=?, gait=?, mental_status=?, total_score=?, risk_level=?,
                    interventions=?, updated_by=?
                WHERE id = ? AND is_deleted = 0`,
                [
                    ward_code, sanitizeHTML(ward_name), staff_id, sanitizeHTML(nurse_name), record_datetime,
                    shift, history_of_falling, secondary_diagnosis, ambulatory_aid,
                    iv_heparin_lock, gait, mental_status, total_score, risk_level,
                    sanitizeHTML(interventions), staff_id, id
                ]
            );
            return { success: true, message: 'Fall risk record updated', data: { id } };
        }

        const [result] = await nurse.execute<ResultSetHeader>(
            `INSERT INTO nursing_fall_risk_records (
                an, ward_code, ward_name, staff_id, nurse_name, record_datetime,
                shift, history_of_falling, secondary_diagnosis, ambulatory_aid,
                iv_heparin_lock, gait, mental_status, total_score, risk_level, interventions, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                an, ward_code, sanitizeHTML(ward_name), staff_id, sanitizeHTML(nurse_name), record_datetime,
                shift, history_of_falling, secondary_diagnosis, ambulatory_aid,
                iv_heparin_lock, gait, mental_status, total_score, risk_level,
                sanitizeHTML(interventions), staff_id
            ]
        );
        return { success: true, message: 'Fall risk record created', data: { id: result.insertId } };
    } catch (error) {
        console.error('upsertFallRiskRecord error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

export const deleteFallRiskRecord = async ({ params, set }: any) => {
    try {
        const id = Number(params.id);
        await nurse.execute(`UPDATE nursing_fall_risk_records SET is_deleted = 1 WHERE id = ?`, [id]);
        return { success: true, message: 'Record deleted successfully' };
    } catch (error) {
        console.error('deleteFallRiskRecord error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

// ============================================================
// 12. แบบประเมินแผลกดทับ (Braden Scale)
// ============================================================

export const getBradenRecords = async ({ params, set }: any) => {
    try {
        const { an } = params;
        const [rows] = await nurse.execute<RowDataPacket[]>(
            `SELECT * FROM nursing_braden_records WHERE an = ? AND is_deleted = 0 ORDER BY record_datetime DESC`,
            [an]
        );
        return { success: true, data: rows };
    } catch (error) {
        console.error('getBradenRecords error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

export const upsertBradenRecord = async ({ body, set }: any) => {
    try {
        const {
            id, an, ward_code, ward_name, staff_id, nurse_name, record_datetime,
            shift, sensory_perception, moisture, activity, mobility, nutrition,
            friction_shear, total_score, risk_level, interventions
        } = body;

        if (id) {
            await nurse.execute(
                `UPDATE nursing_braden_records SET
                    ward_code=?, ward_name=?, staff_id=?, nurse_name=?, record_datetime=?,
                    shift=?, sensory_perception=?, moisture=?, activity=?, mobility=?,
                    nutrition=?, friction_shear=?, total_score=?, risk_level=?, interventions=?, updated_by=?
                WHERE id = ? AND is_deleted = 0`,
                [
                    ward_code, sanitizeHTML(ward_name), staff_id, sanitizeHTML(nurse_name), record_datetime,
                    shift, sensory_perception, moisture, activity, mobility, nutrition,
                    friction_shear, total_score, risk_level, sanitizeHTML(interventions), staff_id, id
                ]
            );
            return { success: true, message: 'Braden record updated', data: { id } };
        }

        const [result] = await nurse.execute<ResultSetHeader>(
            `INSERT INTO nursing_braden_records (
                an, ward_code, ward_name, staff_id, nurse_name, record_datetime,
                shift, sensory_perception, moisture, activity, mobility, nutrition,
                friction_shear, total_score, risk_level, interventions, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                an, ward_code, sanitizeHTML(ward_name), staff_id, sanitizeHTML(nurse_name), record_datetime,
                shift, sensory_perception, moisture, activity, mobility, nutrition,
                friction_shear, total_score, risk_level, sanitizeHTML(interventions), staff_id
            ]
        );
        return { success: true, message: 'Braden record created', data: { id: result.insertId } };
    } catch (error) {
        console.error('upsertBradenRecord error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

export const deleteBradenRecord = async ({ params, set }: any) => {
    try {
        const id = Number(params.id);
        await nurse.execute(`UPDATE nursing_braden_records SET is_deleted = 1 WHERE id = ?`, [id]);
        return { success: true, message: 'Record deleted successfully' };
    } catch (error) {
        console.error('deleteBradenRecord error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

// ============================================================
// 13. แบบประเมินความปวด (Pain Assessment)
// ============================================================

export const getPainRecords = async ({ params, set }: any) => {
    try {
        const { an } = params;
        const [rows] = await nurse.execute<RowDataPacket[]>(
            `SELECT * FROM nursing_pain_records WHERE an = ? AND is_deleted = 0 ORDER BY record_datetime DESC`,
            [an]
        );
        return { success: true, data: rows };
    } catch (error) {
        console.error('getPainRecords error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

export const upsertPainRecord = async ({ body, set }: any) => {
    try {
        const {
            id, an, ward_code, ward_name, staff_id, nurse_name, record_datetime,
            shift, assessment_tool, pain_score, pain_level, location, character,
            onset, duration, aggravating, alleviating, intervention,
            reassess_score, reassess_time
        } = body;

        if (id) {
            await nurse.execute(
                `UPDATE nursing_pain_records SET
                    ward_code=?, ward_name=?, staff_id=?, nurse_name=?, record_datetime=?,
                    shift=?, assessment_tool=?, pain_score=?, pain_level=?, location=?, \`character\`=?,
                    onset=?, duration=?, aggravating=?, alleviating=?, intervention=?,
                    reassess_score=?, reassess_time=?, updated_by=?
                WHERE id = ? AND is_deleted = 0`,
                [
                    ward_code, sanitizeHTML(ward_name), staff_id, sanitizeHTML(nurse_name), record_datetime,
                    shift, assessment_tool, pain_score, pain_level, sanitizeHTML(location), sanitizeHTML(character),
                    sanitizeHTML(onset), sanitizeHTML(duration), sanitizeHTML(aggravating), sanitizeHTML(alleviating),
                    sanitizeHTML(intervention), reassess_score, sanitizeHTML(reassess_time), staff_id, id
                ]
            );
            return { success: true, message: 'Pain record updated', data: { id } };
        }

        const [result] = await nurse.execute<ResultSetHeader>(
            `INSERT INTO nursing_pain_records (
                an, ward_code, ward_name, staff_id, nurse_name, record_datetime,
                shift, assessment_tool, pain_score, pain_level, location, \`character\`,
                onset, duration, aggravating, alleviating, intervention,
                reassess_score, reassess_time, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                an, ward_code, sanitizeHTML(ward_name), staff_id, sanitizeHTML(nurse_name), record_datetime,
                shift, assessment_tool, pain_score, pain_level, sanitizeHTML(location), sanitizeHTML(character),
                sanitizeHTML(onset), sanitizeHTML(duration), sanitizeHTML(aggravating), sanitizeHTML(alleviating),
                sanitizeHTML(intervention), reassess_score, sanitizeHTML(reassess_time), staff_id
            ]
        );
        return { success: true, message: 'Pain record created', data: { id: result.insertId } };
    } catch (error) {
        console.error('upsertPainRecord error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

export const deletePainRecord = async ({ params, set }: any) => {
    try {
        const id = Number(params.id);
        await nurse.execute(`UPDATE nursing_pain_records SET is_deleted = 1 WHERE id = ?`, [id]);
        return { success: true, message: 'Record deleted successfully' };
    } catch (error) {
        console.error('deletePainRecord error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

// ============================================================
// 14. บันทึกการทำแผล (Wound Care Record)
// ============================================================

export const getWoundCareRecords = async ({ params, set }: any) => {
    try {
        const { an } = params;
        const [rows] = await nurse.execute<RowDataPacket[]>(
            `SELECT * FROM nursing_wound_care_records WHERE an = ? AND is_deleted = 0 ORDER BY record_datetime DESC`,
            [an]
        );
        return { success: true, data: rows };
    } catch (error) {
        console.error('getWoundCareRecords error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

export const upsertWoundCareRecord = async ({ body, set }: any) => {
    try {
        const {
            id, an, ward_code, ward_name, staff_id, nurse_name, record_datetime,
            shift, wound_type, wound_location, wound_size, wound_stage,
            wound_appearance, exudate_type, exudate_amount, surrounding_skin,
            odor, pain_score, cleansing_solution, dressing_type,
            procedure_detail, wound_status, next_dressing
        } = body;

        if (id) {
            await nurse.execute(
                `UPDATE nursing_wound_care_records SET
                    ward_code=?, ward_name=?, staff_id=?, nurse_name=?, record_datetime=?,
                    shift=?, wound_type=?, wound_location=?, wound_size=?, wound_stage=?,
                    wound_appearance=?, exudate_type=?, exudate_amount=?, surrounding_skin=?,
                    odor=?, pain_score=?, cleansing_solution=?, dressing_type=?,
                    procedure_detail=?, wound_status=?, next_dressing=?, updated_by=?
                WHERE id = ? AND is_deleted = 0`,
                [
                    ward_code, sanitizeHTML(ward_name), staff_id, sanitizeHTML(nurse_name), record_datetime,
                    shift, sanitizeHTML(wound_type), sanitizeHTML(wound_location), sanitizeHTML(wound_size), wound_stage,
                    sanitizeHTML(wound_appearance), exudate_type, exudate_amount, sanitizeHTML(surrounding_skin),
                    odor, pain_score, sanitizeHTML(cleansing_solution), sanitizeHTML(dressing_type),
                    sanitizeHTML(procedure_detail), wound_status, sanitizeHTML(next_dressing), staff_id, id
                ]
            );
            return { success: true, message: 'Wound care record updated', data: { id } };
        }

        const [result] = await nurse.execute<ResultSetHeader>(
            `INSERT INTO nursing_wound_care_records (
                an, ward_code, ward_name, staff_id, nurse_name, record_datetime,
                shift, wound_type, wound_location, wound_size, wound_stage,
                wound_appearance, exudate_type, exudate_amount, surrounding_skin,
                odor, pain_score, cleansing_solution, dressing_type,
                procedure_detail, wound_status, next_dressing, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                an, ward_code, sanitizeHTML(ward_name), staff_id, sanitizeHTML(nurse_name), record_datetime,
                shift, sanitizeHTML(wound_type), sanitizeHTML(wound_location), sanitizeHTML(wound_size), wound_stage,
                sanitizeHTML(wound_appearance), exudate_type, exudate_amount, sanitizeHTML(surrounding_skin),
                odor, pain_score, sanitizeHTML(cleansing_solution), sanitizeHTML(dressing_type),
                sanitizeHTML(procedure_detail), wound_status, sanitizeHTML(next_dressing), staff_id
            ]
        );
        return { success: true, message: 'Wound care record created', data: { id: result.insertId } };
    } catch (error) {
        console.error('upsertWoundCareRecord error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

export const deleteWoundCareRecord = async ({ params, set }: any) => {
    try {
        const id = Number(params.id);
        await nurse.execute(`UPDATE nursing_wound_care_records SET is_deleted = 1 WHERE id = ?`, [id]);
        return { success: true, message: 'Record deleted successfully' };
    } catch (error) {
        console.error('deleteWoundCareRecord error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

// ============================================================
// 15. บันทึกการผูกยึด (Restraint Record)
// ============================================================

export const getRestraintRecords = async ({ params, set }: any) => {
    try {
        const { an } = params;
        const [rows] = await nurse.execute<RowDataPacket[]>(
            `SELECT * FROM nursing_restraint_records WHERE an = ? AND is_deleted = 0 ORDER BY record_datetime DESC`,
            [an]
        );
        return { success: true, data: rows };
    } catch (error) {
        console.error('getRestraintRecords error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

export const upsertRestraintRecord = async ({ body, set }: any) => {
    try {
        const {
            id, an, ward_code, ward_name, staff_id, nurse_name, record_datetime,
            shift, restraint_type, restraint_site, indication, physician_order,
            start_time, release_time, duration, circulation_check, skin_check,
            rom_exercise, repositioning, nutrition_hydration, toileting,
            patient_response, complications, status
        } = body;

        if (id) {
            await nurse.execute(
                `UPDATE nursing_restraint_records SET
                    ward_code=?, ward_name=?, staff_id=?, nurse_name=?, record_datetime=?,
                    shift=?, restraint_type=?, restraint_site=?, indication=?, physician_order=?,
                    start_time=?, release_time=?, duration=?, circulation_check=?, skin_check=?,
                    rom_exercise=?, repositioning=?, nutrition_hydration=?, toileting=?,
                    patient_response=?, complications=?, status=?, updated_by=?
                WHERE id = ? AND is_deleted = 0`,
                [
                    ward_code, sanitizeHTML(ward_name), staff_id, sanitizeHTML(nurse_name), record_datetime,
                    shift, sanitizeHTML(restraint_type), JSON.stringify(restraint_site), sanitizeHTML(indication),
                    physician_order ?? 0, start_time, release_time, sanitizeHTML(duration),
                    circulation_check ?? 0, skin_check ?? 0, rom_exercise ?? 0, repositioning ?? 0,
                    nutrition_hydration ?? 0, toileting ?? 0,
                    sanitizeHTML(patient_response), sanitizeHTML(complications), status, staff_id, id
                ]
            );
            return { success: true, message: 'Restraint record updated', data: { id } };
        }

        const [result] = await nurse.execute<ResultSetHeader>(
            `INSERT INTO nursing_restraint_records (
                an, ward_code, ward_name, staff_id, nurse_name, record_datetime,
                shift, restraint_type, restraint_site, indication, physician_order,
                start_time, release_time, duration, circulation_check, skin_check,
                rom_exercise, repositioning, nutrition_hydration, toileting,
                patient_response, complications, status, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                an, ward_code, sanitizeHTML(ward_name), staff_id, sanitizeHTML(nurse_name), record_datetime,
                shift, sanitizeHTML(restraint_type), JSON.stringify(restraint_site), sanitizeHTML(indication),
                physician_order ?? 0, start_time, release_time, sanitizeHTML(duration),
                circulation_check ?? 0, skin_check ?? 0, rom_exercise ?? 0, repositioning ?? 0,
                nutrition_hydration ?? 0, toileting ?? 0,
                sanitizeHTML(patient_response), sanitizeHTML(complications), status, staff_id
            ]
        );
        return { success: true, message: 'Restraint record created', data: { id: result.insertId } };
    } catch (error) {
        console.error('upsertRestraintRecord error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

export const deleteRestraintRecord = async ({ params, set }: any) => {
    try {
        const id = Number(params.id);
        await nurse.execute(`UPDATE nursing_restraint_records SET is_deleted = 1 WHERE id = ?`, [id]);
        return { success: true, message: 'Record deleted successfully' };
    } catch (error) {
        console.error('deleteRestraintRecord error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

// ============================================================
// 16. แบบประเมินระดับความรู้สึกตัว (Glasgow Coma Scale - GCS)
// ============================================================

export const getGCSRecords = async ({ params, set }: any) => {
    try {
        const { an } = params;
        const [rows] = await nurse.execute<RowDataPacket[]>(
            `SELECT * FROM nursing_gcs_records WHERE an = ? AND is_deleted = 0 ORDER BY record_datetime DESC`,
            [an]
        );
        return { success: true, data: rows };
    } catch (error) {
        console.error('getGCSRecords error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

export const upsertGCSRecord = async ({ body, set }: any) => {
    try {
        const {
            id, an, ward_code, ward_name, staff_id, nurse_name, record_datetime,
            shift, eye_opening, verbal_response, motor_response, total_score,
            level, pupil_left, pupil_right, pupil_reaction_left, pupil_reaction_right,
            additional_notes
        } = body;

        if (id) {
            await nurse.execute(
                `UPDATE nursing_gcs_records SET
                    ward_code=?, ward_name=?, staff_id=?, nurse_name=?, record_datetime=?,
                    shift=?, eye_opening=?, verbal_response=?, motor_response=?, total_score=?,
                    level=?, pupil_left=?, pupil_right=?, pupil_reaction_left=?, pupil_reaction_right=?,
                    additional_notes=?, updated_by=?
                WHERE id = ? AND is_deleted = 0`,
                [
                    ward_code, sanitizeHTML(ward_name), staff_id, sanitizeHTML(nurse_name), record_datetime,
                    shift, eye_opening, verbal_response, motor_response, total_score,
                    level, sanitizeHTML(pupil_left), sanitizeHTML(pupil_right), pupil_reaction_left,
                    pupil_reaction_right, sanitizeHTML(additional_notes), staff_id, id
                ]
            );
            return { success: true, message: 'GCS record updated', data: { id } };
        }

        const [result] = await nurse.execute<ResultSetHeader>(
            `INSERT INTO nursing_gcs_records (
                an, ward_code, ward_name, staff_id, nurse_name, record_datetime,
                shift, eye_opening, verbal_response, motor_response, total_score,
                level, pupil_left, pupil_right, pupil_reaction_left, pupil_reaction_right,
                additional_notes, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                an, ward_code, sanitizeHTML(ward_name), staff_id, sanitizeHTML(nurse_name), record_datetime,
                shift, eye_opening, verbal_response, motor_response, total_score,
                level, sanitizeHTML(pupil_left), sanitizeHTML(pupil_right), pupil_reaction_left,
                pupil_reaction_right, sanitizeHTML(additional_notes), staff_id
            ]
        );
        return { success: true, message: 'GCS record created', data: { id: result.insertId } };
    } catch (error) {
        console.error('upsertGCSRecord error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

export const deleteGCSRecord = async ({ params, set }: any) => {
    try {
        const id = Number(params.id);
        await nurse.execute(`UPDATE nursing_gcs_records SET is_deleted = 1 WHERE id = ?`, [id]);
        return { success: true, message: 'Record deleted successfully' };
    } catch (error) {
        console.error('deleteGCSRecord error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

// ============================================================
// 17. แบบประเมินสุขภาพจิต/ความวิตกกังวล (Mental Health Assessment)
// ============================================================

export const getMentalHealthRecords = async ({ params, set }: any) => {
    try {
        const { an } = params;
        const [rows] = await nurse.execute<RowDataPacket[]>(
            `SELECT * FROM nursing_mental_health_records WHERE an = ? AND is_deleted = 0 ORDER BY record_datetime DESC`,
            [an]
        );
        return { success: true, data: rows };
    } catch (error) {
        console.error('getMentalHealthRecords error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

export const upsertMentalHealthRecord = async ({ body, set }: any) => {
    try {
        const {
            id, an, ward_code, ward_name, staff_id, nurse_name, record_datetime,
            shift, assessment_tool, q1_score, q2_score, q3_score, q4_score,
            q5_score, q6_score, q7_score, q8_score, q9_score, total_score,
            risk_level, mood, sleep_pattern, appetite, social_interaction,
            interventions, referral
        } = body;

        if (id) {
            await nurse.execute(
                `UPDATE nursing_mental_health_records SET
                    ward_code=?, ward_name=?, staff_id=?, nurse_name=?, record_datetime=?,
                    shift=?, assessment_tool=?, q1_score=?, q2_score=?, q3_score=?, q4_score=?,
                    q5_score=?, q6_score=?, q7_score=?, q8_score=?, q9_score=?, total_score=?,
                    risk_level=?, mood=?, sleep_pattern=?, appetite=?, social_interaction=?,
                    interventions=?, referral=?, updated_by=?
                WHERE id = ? AND is_deleted = 0`,
                [
                    ward_code, sanitizeHTML(ward_name), staff_id, sanitizeHTML(nurse_name), record_datetime,
                    shift, assessment_tool, q1_score ?? 0, q2_score ?? 0, q3_score ?? 0, q4_score ?? 0,
                    q5_score ?? 0, q6_score ?? 0, q7_score ?? 0, q8_score ?? 0, q9_score ?? 0, total_score,
                    sanitizeHTML(risk_level), sanitizeHTML(mood), sanitizeHTML(sleep_pattern),
                    sanitizeHTML(appetite), sanitizeHTML(social_interaction),
                    sanitizeHTML(interventions), sanitizeHTML(referral), staff_id, id
                ]
            );
            return { success: true, message: 'Mental health record updated', data: { id } };
        }

        const [result] = await nurse.execute<ResultSetHeader>(
            `INSERT INTO nursing_mental_health_records (
                an, ward_code, ward_name, staff_id, nurse_name, record_datetime,
                shift, assessment_tool, q1_score, q2_score, q3_score, q4_score,
                q5_score, q6_score, q7_score, q8_score, q9_score, total_score,
                risk_level, mood, sleep_pattern, appetite, social_interaction,
                interventions, referral, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                an, ward_code, sanitizeHTML(ward_name), staff_id, sanitizeHTML(nurse_name), record_datetime,
                shift, assessment_tool, q1_score ?? 0, q2_score ?? 0, q3_score ?? 0, q4_score ?? 0,
                q5_score ?? 0, q6_score ?? 0, q7_score ?? 0, q8_score ?? 0, q9_score ?? 0, total_score,
                sanitizeHTML(risk_level), sanitizeHTML(mood), sanitizeHTML(sleep_pattern),
                sanitizeHTML(appetite), sanitizeHTML(social_interaction),
                sanitizeHTML(interventions), sanitizeHTML(referral), staff_id
            ]
        );
        return { success: true, message: 'Mental health record created', data: { id: result.insertId } };
    } catch (error) {
        console.error('upsertMentalHealthRecord error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};

export const deleteMentalHealthRecord = async ({ params, set }: any) => {
    try {
        const id = Number(params.id);
        await nurse.execute(`UPDATE nursing_mental_health_records SET is_deleted = 1 WHERE id = ?`, [id]);
        return { success: true, message: 'Record deleted successfully' };
    } catch (error) {
        console.error('deleteMentalHealthRecord error:', error);
        set.status = 500;
        return { success: false, message: 'Internal Server Error' };
    }
};
