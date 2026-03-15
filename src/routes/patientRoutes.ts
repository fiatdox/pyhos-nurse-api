import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middlewares/authMiddleware';
import { getPatientsByWard, getPatientsBYAN, registerPatient, savePatientsInShift } from '../controllers/patientController';

export const patientRoutes = new Elysia({ prefix: '/api/v1' })
    .use(authMiddleware)
    .post('/patients-list-by-ward', getPatientsByWard, {
        body: t.Object({
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
            ward: t.String(),
            spclty: t.Number(),
            admission_type_id: t.Number(),
            incharge_doctor: t.String(),
            gender: t.String(),
            bedno: t.String()
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

    