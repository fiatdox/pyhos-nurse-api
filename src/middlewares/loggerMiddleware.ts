import { Elysia } from 'elysia';
import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const LOG_FILE_PATH = 'logs/access.log';

// สร้างโฟลเดอร์สำหรับเก็บ Log ถ้ายังไม่มี
await mkdir(dirname(LOG_FILE_PATH), { recursive: true }).catch(() => {});

const colorMethod = (method: string) => {
    switch (method) {
        case 'GET':
            return `\x1b[32m${method}\x1b[0m`; // Green
        case 'POST':
            return `\x1b[34m${method}\x1b[0m`; // Blue
        case 'PUT':
            return `\x1b[33m${method}\x1b[0m`; // Yellow
        case 'DELETE':
            return `\x1b[31m${method}\x1b[0m`; // Red
        case 'PATCH':
            return `\x1b[35m${method}\x1b[0m`; // Magenta
        default:
            return method;
    }
};

const colorStatus = (status: number | string | undefined) => {
    if (!status) return '\x1b[37mN/A\x1b[0m'; // White for N/A
    const s = status.toString();
    if (typeof status === 'number') {
        if (status >= 500) return `\x1b[31m${s}\x1b[0m`; // Red
        if (status >= 400) return `\x1b[33m${s}\x1b[0m`; // Yellow
        if (status >= 300) return `\x1b[36m${s}\x1b[0m`; // Cyan
        if (status >= 200) return `\x1b[32m${s}\x1b[0m`; // Green
    }
    return `\x1b[37m${s}\x1b[0m`; // White for others
};

export const loggerMiddleware = (app: Elysia) =>
    app
        .onBeforeHandle(({ request, path }) => {
        })
        // เพิ่ม context 'user' หรือ 'store' ตามที่ authMiddleware ส่งมา
        // หมายเหตุ: การเข้าถึง property ที่ถูก derive มาภายหลังอาจต้องใช้ as any หรือกำหนด type ให้ชัดเจน
        .onAfterHandle(async (ctx) => {
            const { request, path, set, server } = ctx;
            const duration = Date.now() - (request.headers.get('x-request-start') ? Number(request.headers.get('x-request-start')) : Date.now());
            const clientIP = server?.requestIP(request)?.address || 'unknown';
            const method = request.method;
            const coloredMethod = colorMethod(method);
            const methodPadding = 6;
            const coloredMethodPadded = coloredMethod + ' '.repeat(Math.max(0, methodPadding - method.length));

            // ดึง Query Params มารวมกับ Path เพื่อให้เห็นข้อมูลครบถ้วน (เช่น ?ward=01)
            const url = new URL(request.url);
            const fullPath = url.pathname + url.search;
            
            // พยายามดึง User ID จาก context (ถ้ามี)
            // authMiddleware จะ derive 'user' { loginname, name } มาให้
            const user = (ctx as any).user;
            const userId = user?.loginname || '-';
            
            // เพิ่ม User Agent และ Referer
            const userAgent = request.headers.get('user-agent') || '-';
            const referer = request.headers.get('referer') || '-';

            console.log(`${clientIP.padEnd(15)} | ${userId.padEnd(10)} | ${coloredMethodPadded} | ${fullPath.padEnd(30)} | ${`${duration}ms`.padEnd(8)} | ${colorStatus(set.status)}`);

            // บันทึกลงไฟล์ (File Log) - ตัดสีออกและเพิ่ม Timestamp
            const timestamp = new Date().toISOString();
            const status = set.status ? set.status.toString() : 'N/A';
            // เพิ่ม Referer และ User Agent ลงในไฟล์ Log (Format คล้าย Combined Log Format)
            const fileLogMessage = `${timestamp} | ${clientIP.padEnd(15)} | ${userId.padEnd(10)} | ${method.padEnd(6)} | ${fullPath.padEnd(30)} | ${`${duration}ms`.padEnd(8)} | ${status} | "${referer}" | "${userAgent}"\n`;

            try {
                await appendFile(LOG_FILE_PATH, fileLogMessage);
            } catch (error) {
                console.error('Error writing to log file:', error);
            }
        })
        .onRequest(ctx => {
            ctx.request.headers.set('x-request-start', Date.now().toString());
        });