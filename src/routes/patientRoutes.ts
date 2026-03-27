import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middlewares/authMiddleware';
import { getPatientsByWard, getPatientsBYAN, registerPatient, savePatientsInShift, getPatientByward, getPatientsRegisterByWard, saveShiftAssessment, getShiftAssessment } from '../controllers/patientController';

export const patientRoutes = new Elysia({ prefix: '/api/v1' })
    .use(authMiddleware)
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
            birth_date: t.Optional(t.Union([t.String(), t.Null()])),
            ward: t.String(),
            spclty: t.Optional(t.Union([t.String(), t.Null()])),
            admission_type_id: t.Optional(t.Union([t.Number(), t.String(), t.Null()])),
            status: t.Optional(t.Union([t.String(), t.Number(), t.Null()])),
            serverity_level_id: t.Optional(t.Union([t.Number(), t.String(), t.Null()])),
            severity_level_id: t.Optional(t.Union([t.Number(), t.String(), t.Null()])),
            incharge_doctor: t.Optional(t.String()),
            gender: t.Optional(t.Union([t.String(), t.Null()])),
            bedno: t.Optional(t.Union([t.String(), t.Null()])),
            is_ventilator: t.Optional(t.String()),
            admission_change_shift_type_id: t.Optional(t.Union([t.Number(), t.String(), t.Null()])),
            before_ward: t.Optional(t.Union([t.String(), t.Null()])),         // ✅ varchar(10)
            oxygen_support_type: t.Optional(t.Union([t.Number(), t.Null()])), // ✅ tinyint(4)
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

