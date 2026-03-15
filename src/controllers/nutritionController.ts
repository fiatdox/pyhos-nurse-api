import { Context } from 'elysia';
import { his,nurse } from '../db';
import { RowDataPacket } from 'mysql2';
import { sanitizeHTML } from '../utils/sanitize';

//ฟังก์ชันสำหรับดึงข้อมูลผูรายการอาหาร
export const getNutritionMenu = async ({ body, set }: Context) => {
    try {
        const [rows] = await nurse.execute<RowDataPacket[]>(
            `select food_item_id,food_name,food_type_id from food_items where is_active = 'Y' `
        );

        return {
            success: true,
            // Sanitize each patient's name before sending it back
            data: rows.map(row => ({
                ...row,
                food_name: sanitizeHTML(row.food_name)
            }))
        };
    } catch (error) {
        console.error('Get nutrition menu error:', error);
        set.status = 500;
        return {
            success: false,
            message: 'Internal Server Error'
        };
    }
};

export const getMeals = async ({ body, set }: Context) => {
    try {
        const [rows] = await nurse.execute<RowDataPacket[]>(
            `select meal, name as meal_name from meal `
        );

        return {
            success: true,
            // ป้องกันการโจมตีแบบ XSS โดยการลบแท็ก HTML ออกจากชื่อมื้ออาหาร
            data: rows.map(row => ({
                ...row,
                meal_name: sanitizeHTML(row.meal_name)
            }))
        };
    } catch (error) {
        console.error('Get meals error:', error);
        set.status = 500;
        return {
            success: false,
            message: 'Internal Server Error'
        };
    }
};

// ฟังก์ชันสำหรับสั่งอาหาร
export const orderMenu = async ({ body, set }: { body: any[], set: any }) => {
    const orders = body;

    if (!orders || orders.length === 0) {
        set.status = 400;
        return {
            success: false,
            message: 'ไม่พบรายการที่ต้องการบันทึก'
        };
    }

    const connection = await nurse.getConnection();

    try {
        await connection.beginTransaction();

        // บันทึกข้อมูลลงตาราง food_orders แบบ Bulk Insert
        // โดยมี Unique Key คือ (order_date, meal, an) หากซ้ำให้ทำการ Update
        const sql = `
            INSERT INTO food_orders (
                admission_list_id,
                an,
                ward,
                order_date,
                meal,
                food_item_id,
                request_by,
                addon,
                create_datetime
            ) VALUES ?
            ON DUPLICATE KEY UPDATE
                food_item_id = VALUES(food_item_id),
                addon = VALUES(addon),
                request_by = VALUES(request_by),
                ward = VALUES(ward)
        `;

        const values = orders.map(o => [
            o.admission_list_id,
            o.an,
            o.ward,
            o.order_date,
            o.meal,
            o.food_item_id,
            o.request_by,
            o.addon,
            new Date()
        ]);

        await connection.query(sql, [values]);

        await connection.commit();

        return {
            success: true,
            message: `บันทึกรายการอาหารเรียบร้อยแล้ว จำนวน ${orders.length} รายการ`
        };
    } catch (error) {
        await connection.rollback();
        console.error('Order menu error:', error);
        set.status = 500;
        return {
            success: false,
            message: 'Internal Server Error'
        };
    } finally {
        connection.release();
    }
};

// ฟังก์ชันสำหรับยกเลิกรายการอาหาร
export const cancelOrderMenu = async ({ body, set }: { body: any[], set: any }) => {
    const orders = body;

    if (!orders || orders.length === 0) {
        set.status = 400;
        return {
            success: false,
            message: 'ไม่พบรายการที่ต้องการลบ'
        };
    }

    const connection = await nurse.getConnection();

    try {
        await connection.beginTransaction();

        const values = orders.map(o => o.food_order_id);
        const sql = `DELETE FROM food_orders WHERE food_order_id IN (?)`;

        const [result] = await connection.query(sql, [values]);

        await connection.commit();

        return {
            success: true,
            message: `ลบรายการอาหารเรียบร้อยแล้ว จำนวน ${(result as any).affectedRows} รายการ`
        };
    } catch (error) {
        await connection.rollback();
        console.error('Cancel order menu error:', error);
        set.status = 500;
        return {
            success: false,
            message: 'Internal Server Error'
        };
    } finally {
        connection.release();
    }
};