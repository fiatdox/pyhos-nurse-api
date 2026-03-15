import mysql from 'mysql2/promise';

export const his = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 50,
    queueLimit: 0
});

export const nurse = mysql.createPool({
    host: process.env.NURSE_RECORD_HOST,
    port: Number(process.env.NURSE_RECORD_PORT),
    user: process.env.NURSE_RECORD_USER,
    password: process.env.NURSE_RECORD_PASSWORD,
    database: process.env.NURSE_RECORD_NAME,
    waitForConnections: true,
    connectionLimit: 50,
    queueLimit: 0
});