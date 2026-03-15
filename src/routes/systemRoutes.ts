import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middlewares/authMiddleware';
import { getSpclty, getWards,getAdmissionType,getAdmissionSeverityLV,getAdmissionChangeShiftTypes, getAllStaff, addStaff, addWardStaffs, getWardStaffByWard, clearWardStaffsByWard } from '../controllers/systemController';

export const SystemRoutes = new Elysia({ prefix: '/api/v1' })
    .use(authMiddleware)
    // เพิ่มเส้นทางสำหรับดึงข้อมูลหอผู้ป่วย
    .get('/wards', getWards, {
        body: t.Object({
            ward: t.String()
        })
    })
    // เพิ่มเส้นทางสำหรับดึงแผนกการรักษา
    .get('/spclty', getSpclty, {
        body: t.Object({
            spclty: t.String()
        })
    })
    // เพิ่มเส้นทางสำหรับดึงข้อมูลประเภทการรับเข้าผู้ป่วย
    .get('/admission-types', getAdmissionType, {
        body: t.Object({
            admission_type: t.String()
        })
    })
    // เพิ่มเส้นทางสำหรับดึงข้อมูลระดับความรุนแรงของการรับเข้าผู้ป่วย
    .get('/admission-severity-levels', getAdmissionSeverityLV, {
        body: t.Object({
            severity_level: t.String()
        })
    })
    // เพิ่มเส้นทางสำหรับดึงข้อมูลประเภทเวร
    .get('/admission-change-shift-types', getAdmissionChangeShiftTypes, {
        body: t.Object({
            admission_change_shift_type: t.String()
        })
    })
    // เพิ่มเส้นทางสำหรับดึงข้อมูลเจ้าหน้าที่ทั้งหมด
    .get('/staffs', getAllStaff)
    // เพิ่มเส้นทางสำหรับเพิ่มข้อมูลเจ้าหน้าที่
    .post('/staffs', addStaff, {
        body: t.Object({
            fullname: t.String(),
            staff_position_id: t.Number(),
            is_active: t.Optional(t.String())
        })
    })
    // เพิ่มเส้นทางสำหรับบันทึก/ปรับปรุงเจ้าหน้าที่ประจำหอผู้ป่วย
    .post('/ward-staffs', addWardStaffs, {
        body: t.Array(t.Object({
            // ใช้ t.Union เพื่อให้รองรับการส่งค่ามาเป็น String หรือ Number ก็ได้
            staff_id: t.Union([t.String(), t.Number()]),
            ward: t.Union([t.String(), t.Number()])
        }))
    })
    // เพิ่มเส้นทางสำหรับดึงข้อมูลเจ้าหน้าที่ตามหอผู้ป่วย
    .get('/ward-staffs/:id', getWardStaffByWard, {
        params: t.Object({
            id: t.String()
        })
    })
    // เพิ่มเส้นทางสำหรับเคลียร์เจ้าหน้าที่ออกจากหอผู้ป่วยทั้งหมด
    .delete('/ward-staffs-clear/:ward', clearWardStaffsByWard, {
        params: t.Object({
            ward: t.String()
        })
    });
