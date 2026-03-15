// ฟังก์ชันช่วยในการลบแท็ก HTML จากข้อความ เพื่อป้องกันการโจมตีแบบ XSS
export const sanitizeHTML = (text: string | null): string | null => {
    if (text === null || text === undefined) return null;
    // ป้องกันการโจมตีแบบ XSS โดยการลบแท็ก HTML ออกจากข้อความ
    return text.toString().replace(/<[^>]*>/g, '');
};
