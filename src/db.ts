import mysql from 'mysql2/promise';
import postgres from 'postgres';

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

export const hris = mysql.createPool({
    host: process.env.HRIS_HOST,
    port: Number(process.env.HRIS_PORT),
    user: process.env.HRIS_USER,
    password: process.env.HRIS_PASSWORD,
    database: process.env.HRIS_NAME,
    waitForConnections: true,
    connectionLimit: 50,
    queueLimit: 0
});


export const core_kon = postgres({
    host: process.env.CORE_KON_HOST,
    port: Number(process.env.CORE_KON_PORT),
    user: process.env.CORE_KON_USER,
    password: process.env.CORE_KON_PASSWORD,
    database: process.env.CORE_KON_DB_NAME,
    connection: { search_path: process.env.CORE_KON_SCHEMA },
    max: 50,
    idle_timeout: 30,
});