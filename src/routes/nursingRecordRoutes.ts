import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middlewares/authMiddleware';
import {
    // 1. Admit
    getAdmitRecord, upsertAdmitRecord,
    // 2. Vital
    getVitalRecords, upsertVitalRecord, deleteVitalRecord,
    // 3. Nursing Notes
    getNursingNotes, upsertNursingNote, deleteNursingNote,
    // 4. Care Plan
    getCarePlans, upsertCarePlan, deleteCarePlan,
    // 5. I/O
    getIORecords, upsertIORecord, deleteIORecord,
    // 6. MAR
    getMedicationOrders, getMedicationAdmins, upsertMedicationAdmin, deleteMedicationAdmin,
    // 7. Special Care
    getSpecialCareRecords, upsertSpecialCareRecord, deleteSpecialCareRecord,
    // 8. Education
    getEducationRecords, upsertEducationRecord, deleteEducationRecord,
    // 9. Handover
    getHandoverRecords, upsertHandoverRecord, deleteHandoverRecord,
    // 10. Discharge
    getDischargeRecord, upsertDischargeRecord,
    // 11. Fall Risk
    getFallRiskRecords, upsertFallRiskRecord, deleteFallRiskRecord,
    // 12. Braden
    getBradenRecords, upsertBradenRecord, deleteBradenRecord,
    // 13. Pain
    getPainRecords, upsertPainRecord, deletePainRecord,
    // 14. Wound Care
    getWoundCareRecords, upsertWoundCareRecord, deleteWoundCareRecord,
    // 15. Restraint
    getRestraintRecords, upsertRestraintRecord, deleteRestraintRecord,
    // 16. GCS
    getGCSRecords, upsertGCSRecord, deleteGCSRecord,
    // 17. Mental Health
    getMentalHealthRecords, upsertMentalHealthRecord, deleteMentalHealthRecord,
} from '../controllers/nursingRecordController';

// Common fields schema
const commonFields = {
    an: t.String(),
    ward_code: t.String(),
    ward_name: t.Optional(t.Union([t.String(), t.Null()])),
    staff_id: t.String(),
    nurse_name: t.Optional(t.Union([t.String(), t.Null()])),
};

const anParam = { params: t.Object({ an: t.String() }) };
const idParam = { params: t.Object({ id: t.String() }) };

const optStr = () => t.Optional(t.Union([t.String(), t.Null()]));
const optNum = () => t.Optional(t.Union([t.Number(), t.Null()]));
const optBool = () => t.Optional(t.Union([t.Number(), t.Null()]));
const optId = () => t.Optional(t.Number());

export const nursingRecordRoutes = new Elysia({ prefix: '/api/v1' })
    .use(authMiddleware)
    .guard({ detail: { tags: ['Nursing Records'] } })

    // ========== 1. Admit Record ==========
    .get('/nursing-records/admit/:an', getAdmitRecord, anParam)
    .post('/nursing-records/admit', upsertAdmitRecord, {
        body: t.Object({
            ...commonFields,
            record_datetime: t.String(),
            admit_from: optStr(),
            admit_method: optStr(),
            admit_reason: optStr(),
            chief_complaint: optStr(),
            present_illness: optStr(),
            past_illness: optStr(),
            allergies: optStr(),
            current_medications: optStr(),
            general_appearance: optStr(),
            skin_condition: optStr(),
            mobility: optStr(),
            communication: optStr(),
            religion: optStr(),
            occupation: optStr(),
            vital_t: optNum(),
            vital_p: optNum(),
            vital_r: optNum(),
            vital_bp: optStr(),
            vital_o2sat: optNum(),
            consciousness: optStr(),
            pain_score: optNum(),
            nutrition_screening: optStr(),
            weight: optNum(),
            height: optNum(),
            bmi: optNum(),
            diagnosis_summary: optStr(),
            treatment_summary: optStr(),
            caregiver_name: optStr(),
            caregiver_relation: optStr(),
            caregiver_phone: optStr(),
            nursing_diagnosis: optStr(),
            nursing_plan: optStr(),
        })
    })

    // ========== 2. Vital Signs ==========
    .get('/nursing-records/vital/:an', getVitalRecords, anParam)
    .post('/nursing-records/vital', upsertVitalRecord, {
        body: t.Object({
            id: optId(),
            ...commonFields,
            record_datetime: t.String(),
            vital_t: optNum(),
            vital_p: optNum(),
            vital_r: optNum(),
            vital_bp_s: optNum(),
            vital_bp_d: optNum(),
            vital_o2sat: optNum(),
            pain_score: optNum(),
            consciousness: optStr(),
        })
    })
    .delete('/nursing-records/vital/:id', deleteVitalRecord, idParam)

    // ========== 3. Nursing Progress Notes ==========
    .get('/nursing-records/nursing/:an', getNursingNotes, anParam)
    .post('/nursing-records/nursing', upsertNursingNote, {
        body: t.Object({
            id: optId(),
            ...commonFields,
            record_datetime: t.String(),
            shift: t.String(),
            focus: optStr(),
            note_type: t.Optional(t.String()),
            subjective: optStr(),
            objective: optStr(),
            assessment: optStr(),
            intervention: optStr(),
            plan: optStr(),
            evaluation: optStr(),
        })
    })
    .delete('/nursing-records/nursing/:id', deleteNursingNote, idParam)

    // ========== 4. Nursing Care Plan ==========
    .get('/nursing-records/careplan/:an', getCarePlans, anParam)
    .post('/nursing-records/careplan', upsertCarePlan, {
        body: t.Object({
            id: optId(),
            ...commonFields,
            start_date: t.String(),
            priority: t.String(),
            nursing_diagnosis: t.String(),
            related_to: optStr(),
            goal: optStr(),
            expected_outcome: optStr(),
            interventions: optStr(),
            evaluation: optStr(),
            evaluation_date: optStr(),
            status: t.Optional(t.String()),
        })
    })
    .delete('/nursing-records/careplan/:id', deleteCarePlan, idParam)

    // ========== 5. I/O Record ==========
    .get('/nursing-records/io/:an', getIORecords, anParam)
    .post('/nursing-records/io', upsertIORecord, {
        body: t.Object({
            id: optId(),
            ...commonFields,
            record_datetime: t.String(),
            shift: t.String(),
            io_type: t.String(),
            category: t.String(),
            item_name: optStr(),
            amount: t.Number(),
            unit: t.Optional(t.String()),
            route: optStr(),
            note: optStr(),
        })
    })
    .delete('/nursing-records/io/:id', deleteIORecord, idParam)

    // ========== 6. MAR (Medication Administration Record) ==========
    .get('/nursing-records/mar/orders/:an', getMedicationOrders, anParam)
    .get('/nursing-records/mar/admins/:an', getMedicationAdmins, anParam)
    .post('/nursing-records/mar/admin', upsertMedicationAdmin, {
        body: t.Object({
            id: optId(),
            order_id: t.Number(),
            ...commonFields,
            admin_datetime: t.String(),
            shift: optStr(),
            medication_name: t.String(),
            dose_given: t.String(),
            route: optStr(),
            site: optStr(),
            status: t.String(),
            held_reason: optStr(),
            note: optStr(),
        })
    })
    .delete('/nursing-records/mar/admin/:id', deleteMedicationAdmin, idParam)

    // ========== 7. Special Care Records ==========
    .get('/nursing-records/special/:an', getSpecialCareRecords, anParam)
    .post('/nursing-records/special', upsertSpecialCareRecord, {
        body: t.Object({
            id: optId(),
            ...commonFields,
            record_datetime: t.String(),
            shift: t.String(),
            care_type: t.String(),
            care_detail: optStr(),
            procedure_done: optStr(),
            patient_response: optStr(),
            complications: optStr(),
            equipment_used: optStr(),
            next_plan: optStr(),
        })
    })
    .delete('/nursing-records/special/:id', deleteSpecialCareRecord, idParam)

    // ========== 8. Patient Education ==========
    .get('/nursing-records/education/:an', getEducationRecords, anParam)
    .post('/nursing-records/education', upsertEducationRecord, {
        body: t.Object({
            id: optId(),
            ...commonFields,
            record_datetime: t.String(),
            shift: t.String(),
            category: t.String(),
            topic: t.String(),
            target_audience: optStr(),
            teaching_method: optStr(),
            content_taught: optStr(),
            materials_used: optStr(),
            learner_response: optStr(),
            understanding_level: optStr(),
            barriers: optStr(),
            follow_up_plan: optStr(),
        })
    })
    .delete('/nursing-records/education/:id', deleteEducationRecord, idParam)

    // ========== 9. Handover (SBAR) ==========
    .get('/nursing-records/handover/:an', getHandoverRecords, anParam)
    .post('/nursing-records/handover', upsertHandoverRecord, {
        body: t.Object({
            id: optId(),
            ...commonFields,
            handover_datetime: t.String(),
            shift_from: t.String(),
            shift_to: t.String(),
            nurse_from: t.String(),
            nurse_to: t.String(),
            situation: optStr(),
            background: optStr(),
            assessment: optStr(),
            recommendation: optStr(),
            pending_orders: optStr(),
            pending_labs: optStr(),
            iv_fluid_status: optStr(),
            diet: optStr(),
            activity: optStr(),
            safety_concerns: optStr(),
            family_issues: optStr(),
        })
    })
    .delete('/nursing-records/handover/:id', deleteHandoverRecord, idParam)

    // ========== 10. Discharge Record ==========
    .get('/nursing-records/discharge/:an', getDischargeRecord, anParam)
    .post('/nursing-records/discharge', upsertDischargeRecord, {
        body: t.Object({
            ...commonFields,
            record_datetime: t.String(),
            discharge_datetime: t.String(),
            discharge_type: t.String(),
            discharge_condition: t.String(),
            vital_t: optNum(),
            vital_p: optNum(),
            vital_r: optNum(),
            vital_bp: optStr(),
            vital_o2sat: optNum(),
            diagnosis_summary: optStr(),
            treatment_summary: optStr(),
            procedure_done: optStr(),
            medication_instructions: optStr(),
            diet_instructions: optStr(),
            activity_instructions: optStr(),
            wound_care_instructions: optStr(),
            warning_signs: optStr(),
            follow_up_appointment: optStr(),
            education_completed: optBool(),
            medication_provided: optBool(),
            documents_given: optBool(),
            transportation_arranged: optBool(),
            referral_arranged: optBool(),
            discharged_with: optStr(),
            caregiver_name: optStr(),
            caregiver_phone: optStr(),
            discharge_destination: optStr(),
        })
    })

    // ========== 11. Fall Risk (Morse Fall Scale) ==========
    .get('/nursing-records/fall-risk/:an', getFallRiskRecords, anParam)
    .post('/nursing-records/fall-risk', upsertFallRiskRecord, {
        body: t.Object({
            id: optId(),
            ...commonFields,
            record_datetime: t.String(),
            shift: t.String(),
            history_of_falling: t.Number(),
            secondary_diagnosis: t.Number(),
            ambulatory_aid: t.Number(),
            iv_heparin_lock: t.Number(),
            gait: t.Number(),
            mental_status: t.Number(),
            total_score: t.Number(),
            risk_level: t.String(),
            interventions: optStr(),
        })
    })
    .delete('/nursing-records/fall-risk/:id', deleteFallRiskRecord, idParam)

    // ========== 12. Braden Scale ==========
    .get('/nursing-records/braden/:an', getBradenRecords, anParam)
    .post('/nursing-records/braden', upsertBradenRecord, {
        body: t.Object({
            id: optId(),
            ...commonFields,
            record_datetime: t.String(),
            shift: t.String(),
            sensory_perception: t.Number(),
            moisture: t.Number(),
            activity: t.Number(),
            mobility: t.Number(),
            nutrition: t.Number(),
            friction_shear: t.Number(),
            total_score: t.Number(),
            risk_level: t.String(),
            interventions: optStr(),
        })
    })
    .delete('/nursing-records/braden/:id', deleteBradenRecord, idParam)

    // ========== 13. Pain Assessment ==========
    .get('/nursing-records/pain/:an', getPainRecords, anParam)
    .post('/nursing-records/pain', upsertPainRecord, {
        body: t.Object({
            id: optId(),
            ...commonFields,
            record_datetime: t.String(),
            shift: t.String(),
            assessment_tool: t.String(),
            pain_score: t.Number(),
            pain_level: t.String(),
            location: optStr(),
            character: optStr(),
            onset: optStr(),
            duration: optStr(),
            aggravating: optStr(),
            alleviating: optStr(),
            intervention: optStr(),
            reassess_score: optNum(),
            reassess_time: optStr(),
        })
    })
    .delete('/nursing-records/pain/:id', deletePainRecord, idParam)

    // ========== 14. Wound Care ==========
    .get('/nursing-records/wound-care/:an', getWoundCareRecords, anParam)
    .post('/nursing-records/wound-care', upsertWoundCareRecord, {
        body: t.Object({
            id: optId(),
            ...commonFields,
            record_datetime: t.String(),
            shift: t.String(),
            wound_type: t.String(),
            wound_location: t.String(),
            wound_size: optStr(),
            wound_stage: optStr(),
            wound_appearance: optStr(),
            exudate_type: optStr(),
            exudate_amount: optStr(),
            surrounding_skin: optStr(),
            odor: optStr(),
            pain_score: optNum(),
            cleansing_solution: optStr(),
            dressing_type: optStr(),
            procedure_detail: optStr(),
            wound_status: t.String(),
            next_dressing: optStr(),
        })
    })
    .delete('/nursing-records/wound-care/:id', deleteWoundCareRecord, idParam)

    // ========== 15. Restraint ==========
    .get('/nursing-records/restraint/:an', getRestraintRecords, anParam)
    .post('/nursing-records/restraint', upsertRestraintRecord, {
        body: t.Object({
            id: optId(),
            ...commonFields,
            record_datetime: t.String(),
            shift: t.String(),
            restraint_type: t.String(),
            restraint_site: t.Array(t.String()),
            indication: t.String(),
            physician_order: optBool(),
            start_time: t.String(),
            release_time: optStr(),
            duration: optStr(),
            circulation_check: optBool(),
            skin_check: optBool(),
            rom_exercise: optBool(),
            repositioning: optBool(),
            nutrition_hydration: optBool(),
            toileting: optBool(),
            patient_response: optStr(),
            complications: optStr(),
            status: t.String(),
        })
    })
    .delete('/nursing-records/restraint/:id', deleteRestraintRecord, idParam)

    // ========== 16. GCS (Glasgow Coma Scale) ==========
    .get('/nursing-records/gcs/:an', getGCSRecords, anParam)
    .post('/nursing-records/gcs', upsertGCSRecord, {
        body: t.Object({
            id: optId(),
            ...commonFields,
            record_datetime: t.String(),
            shift: t.String(),
            eye_opening: t.Number(),
            verbal_response: t.Number(),
            motor_response: t.Number(),
            total_score: t.Number(),
            level: t.String(),
            pupil_left: optStr(),
            pupil_right: optStr(),
            pupil_reaction_left: optStr(),
            pupil_reaction_right: optStr(),
            additional_notes: optStr(),
        })
    })
    .delete('/nursing-records/gcs/:id', deleteGCSRecord, idParam)

    // ========== 17. Mental Health Assessment ==========
    .get('/nursing-records/mental-health/:an', getMentalHealthRecords, anParam)
    .post('/nursing-records/mental-health', upsertMentalHealthRecord, {
        body: t.Object({
            id: optId(),
            ...commonFields,
            record_datetime: t.String(),
            shift: t.String(),
            assessment_tool: t.String(),
            q1_score: t.Optional(t.Number()),
            q2_score: t.Optional(t.Number()),
            q3_score: t.Optional(t.Number()),
            q4_score: t.Optional(t.Number()),
            q5_score: t.Optional(t.Number()),
            q6_score: t.Optional(t.Number()),
            q7_score: t.Optional(t.Number()),
            q8_score: t.Optional(t.Number()),
            q9_score: t.Optional(t.Number()),
            total_score: t.Number(),
            risk_level: t.String(),
            mood: optStr(),
            sleep_pattern: optStr(),
            appetite: optStr(),
            social_interaction: optStr(),
            interventions: optStr(),
            referral: optStr(),
        })
    })
    .delete('/nursing-records/mental-health/:id', deleteMentalHealthRecord, idParam);
