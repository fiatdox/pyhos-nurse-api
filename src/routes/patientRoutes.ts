import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middlewares/authMiddleware';
import { getPatientsByWard, getPatientsBYAN, registerPatient, updatePatient, savePatientsInShift, getPatientByward, getDischargedPatientByWard, getPatientsRegisterByWard, saveShiftAssessment, getShiftAssessment, dischargePatient, getPatientDischargeByWard, cancelDischarge, upsertAdmissionShiftDailyRecord, getPatientShiftDailyRecordsByWard, copyPreviousShiftDailyRecords, getPatientShiftDailyRecordsSummary } from '../controllers/patientController';

export const patientRoutes = new Elysia({ prefix: '/api/v1' })
    .use(authMiddleware)
    .guard({ detail: { tags: ['Patient'] } })
    .post('/patients-list-by-ward', getPatientsByWard, {
        body: t.Object({
            ward: t.String()
        })
    })
    .get('/view-patient-by-ward/:ward', getPatientByward, {
        params: t.Object({
            ward: t.String()
        })
    })
    .post('/view-discharged-patient-by-ward', getDischargedPatientByWard, {
        body: t.Object({
            ward: t.String(),
            ds1: t.String(),
            ds2: t.String(),
        })
    })
    .get('/patients-register-by-ward/:ward', getPatientsRegisterByWard, {
        params: t.Object({
            ward: t.String()
        })
    })
    .post('/patient-by-an', getPatientsBYAN, {
        body: t.Object({
            an: t.String()
        })
    })
    .post('/register-patient', registerPatient, {
        body: t.Object({
            an: t.String(),
            hn: t.String(),
            patient_name: t.String(),
            reg_datetime: t.String(),
            before_ward: t.Optional(t.Union([t.String(), t.Null()])),
            ward: t.String(),
            birth_date: t.Optional(t.Union([t.String(), t.Null()])),
            spclty: t.Optional(t.Union([t.String(), t.Null()])),
            gender: t.Optional(t.Union([t.String(), t.Null()])),
            bedno: t.Optional(t.Union([t.String(), t.Null()])),
            admission_type_id: t.Optional(t.Union([t.Number(), t.Null()])),
            status: t.Optional(t.Union([t.Number(), t.Null()])),
            admission_change_shift_type_id: t.Optional(t.Union([t.Number(), t.Null()])),
            incharge_doctor: t.Optional(t.String()),
        })
    })
    .post('/update-patient', updatePatient, {
        body: t.Object({
            admission_list_id: t.Number(),
            patient_name: t.String(),
            reg_datetime: t.String(),
            before_ward: t.Optional(t.Union([t.String(), t.Null()])),
            ward: t.String(),
            birth_date: t.Optional(t.Union([t.String(), t.Null()])),
            spclty: t.Optional(t.Union([t.String(), t.Null()])),
            bedno: t.Optional(t.Union([t.String(), t.Null()])),
            admission_type_id: t.Optional(t.Union([t.Number(), t.Null()])),
            status: t.Optional(t.Union([t.Number(), t.Null()])),
            admission_change_shift_type_id: t.Optional(t.Union([t.Number(), t.Null()])),
            incharge_doctor: t.Optional(t.String()),
        })
    })
    .post('/get-shift-assessment', getShiftAssessment, {
        body: t.Object({
            admission_list_id: t.Number(),
            shift_date: t.String(),
            admission_change_shift_type_id: t.Number(),
            ward: t.String(),
        })
    })
    .post('/save-shift-assessment', saveShiftAssessment, {
        body: t.Object({
            admission_list_id: t.Number(),
            admission_change_shift_type_id: t.Number(),
            an: t.String(),
            hn: t.String(),
            ward: t.String(),
            shift_date: t.String(),
            staff: t.Optional(t.Union([t.String(), t.Null()])),
            severity_level_id: t.Number(),
            ventilator_use: t.Optional(t.Union([t.String(), t.Null()])),
            level_of_care: t.Optional(t.Union([t.Number(), t.Null()])),
            pain_score: t.Optional(t.Union([t.Number(), t.Null()])),
            fall_risk: t.Optional(t.Union([t.Number(), t.Null()])),
            pressure_sore_risk: t.Optional(t.Union([t.Number(), t.Null()])),
            gcs_eye: t.Optional(t.Union([t.Number(), t.Null()])),
            gcs_verbal: t.Optional(t.Union([t.Number(), t.Null()])),
            gcs_motor: t.Optional(t.Union([t.Number(), t.Null()])),
            oxygen_support_type_id: t.Optional(t.Union([t.Number(), t.Null()])),
            safety_precautions: t.Optional(t.Union([t.Array(t.String()), t.Null()])),
            comment: t.Optional(t.Union([t.String(), t.Null()])),
        })
    })
    .post('/patient-discharge-by-ward', getPatientDischargeByWard, {
        body: t.Object({
            ward: t.String(),
            date_from: t.Optional(t.Union([t.String(), t.Null()])),
            date_to: t.Optional(t.Union([t.String(), t.Null()])),
        })
    })
    .get('/cancel-discharge/:admission_list_id', cancelDischarge, {
        params: t.Object({
            admission_list_id: t.String()
        })
    })
    .post('/discharge-patient', dischargePatient, {
        body: t.Object({
            admission_list_id: t.Number(),
            discharge_type_id: t.Number(),
            discharge_datetime: t.String(),
            move_to_ward: t.Union([t.String(), t.Null()]),
            status: t.Union([t.String(), t.Number()]),
            los: t.Number(),
        })
    })
    .post('/patient-shift-daily-records/copy-previous', copyPreviousShiftDailyRecords, {
        body: t.Object({
            ward: t.String(),
            target_date: t.String(),
            target_shift_type_id: t.Number(),
            source_date: t.String(),
            source_shift_type_id: t.Number()
        })
    })
    .post('/patient-shift-daily-records', getPatientShiftDailyRecordsByWard, {
        body: t.Object({
            ward: t.String(),
            date: t.String()
        })
    })
    .post('/patient-shift-daily-records-summary', getPatientShiftDailyRecordsSummary, {
        body: t.Object({
            ward: t.String(),
            date: t.String()
        })
    })
    .post('/admission-shift-daily-records', upsertAdmissionShiftDailyRecord, {
        body: t.Object({
            admission_list_id: t.Number(),
            level: t.Optional(t.Union([t.Number(), t.Null()])),
            admission_shift_care_level_id: t.Optional(t.Union([t.Number(), t.Null()])),
            shift_type_id: t.Number(),
            date: t.String(),
            hn: t.Optional(t.String()),
            an: t.Optional(t.String()),
            severity_level_id: t.Optional(t.Number())
        })
    })
    .post('/save-patients-in-shift', savePatientsInShift, {
        body: t.Array(t.Object({
            admission_list_id: t.Number(),
            admission_change_shift_type_id: t.Number(),
            an: t.String(),
            hn: t.String(),
            ward: t.String(),
            shift_date: t.String(),
            staff: t.String(),
            severity_level_id: t.Number(),
            ventilator_use: t.String(),
            comment: t.String()
        }))
    });

