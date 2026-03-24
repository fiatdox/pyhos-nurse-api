import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middlewares/authMiddleware';
import { addNurseSchedule, deleteNurseSchedule, getNurseSchedule, getNurseScheduleDetail, getNurseScheduleByDate } from '../controllers/nurseController';

export const nurseRoutes = new Elysia({ prefix: '/api/v1/nurse' })
    .use(authMiddleware)
    // Route สำหรับเพิ่มและอัพเดทตารางการทำงานของพยาบาล
    .post('/nurse-schedules', addNurseSchedule, {
        body: t.Array(t.Object({
            staff_id: t.Number(),
            shift_date: t.String(),
            shift_code: t.String(),
            ward: t.String(),
            created_by: t.Optional(t.Union([t.Number(), t.Null()])),
            updated_by: t.Optional(t.Union([t.Number(), t.Null()]))
        }))
    })
    // Route สำหรับลบตารางการทำงานของพยาบาล
    .post('/nurse-schedules-delete', deleteNurseSchedule, {
        body: t.Array(
            t.Union([
                t.Number(),
                t.Object({ shift_assignment_id: t.Number() })
            ])
        )
    })
    // Route สำหรับดึงข้อมูลตารางการทำงานของพยาบาลตาม ward และเดือน
    .get('/nurse-schedules', getNurseSchedule, {
        query: t.Object({
            ward: t.String(),
            month: t.String()
        })
    })
    // Route สำหรับดึงข้อมูลตารางการทำงานของพยาบาลแบบเจาะจง (ward, shift_date, staff_id)
    .post('/nurse-schedule-detail', getNurseScheduleDetail, {
        body: t.Object({
            ward: t.String(),
            shift_date: t.String(),
            staff_id: t.Number(),
            shift_code: t.Optional(t.String())
        })
    })

    // Route สำหรับดึงข้อมูลเวรปฏิบัติงาน (รองรับ POST ward, date)
    .post('/nurse-schedule-by-date', getNurseScheduleByDate, {
        body: t.Object({
            ward: t.String(),
            date: t.String()
        })
    });