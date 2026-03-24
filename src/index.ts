import { Elysia } from 'elysia';
import { rateLimit } from 'elysia-rate-limit';
import { authRoutes } from './routes/authRoutes';
import { protectedRoutes } from './routes/protectedRoutes';
import { patientRoutes } from './routes/patientRoutes';
import { nutritionRoutes } from './routes/nutritionRoutes';
import { SystemRoutes } from './routes/systemRoutes'; //ข้อมูลพื้นฐาน เช่น หอผู้ป่วย
import { nurseRoutes } from './routes/nurseRoutes';
import { icRoutes } from './routes/icRoutes';

// Import middlewares
import { securityMiddleware } from './middlewares/securityMiddleware';
import { loggerMiddleware } from './middlewares/loggerMiddleware';

const app = new Elysia()
    .use(loggerMiddleware)
    .use(rateLimit({
        duration: 60000, // 1 นาที (หน่วยเป็น milliseconds)
        max: 50,        // จำกัดสูงสุด 50 requests ต่อ IP ภายในระยะเวลาที่กำหนด
        errorResponse: 'Rate limit exceeded. Please try again later.' // ข้อความเมื่อเกินลิมิต
    }))
    .use(securityMiddleware) 
    
    .use(authRoutes) // เส้นทางสำหรับการเข้าสู่ระบบและการจัดการโทเค็น
    
    // ป้องกันเส้นทางที่ต้องการการตรวจสอบสิทธิ์ด้วย authMiddleware ซึ่งจะถูกใช้ใน protectedRoutes, patientRoutes และ nutritionRoutes
    .use(protectedRoutes)
    .use(patientRoutes)
    .use(nutritionRoutes)
    .use(SystemRoutes)
    .use(nurseRoutes)
    .use(icRoutes)
    .listen(3000);

  
console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);