import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middlewares/authMiddleware';
import { getIpdPatientHistoryDaily, getOpdPatientHistoryDaily, getResultInFiscalYear, getResultDepInFiscalYear, operationFollowup } from '../controllers/icController';

export const icRoutes = new Elysia({ prefix: '/api/v1/ic' })
    .use(authMiddleware)
    .get('/ipd-patient-history-daily', getIpdPatientHistoryDaily)
    .get('/opd-patient-history-daily', getOpdPatientHistoryDaily)
    .get('/result-in-fiscal-year', getResultInFiscalYear)
    .get('/result-dep-in-fiscal-year', getResultDepInFiscalYear)
    .post('/operation-followup', operationFollowup, {
        body: t.Object({
            date1: t.String(),
            date2: t.String()
        })
    });