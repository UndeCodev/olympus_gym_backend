import dotenv from 'dotenv';
dotenv.config();

export const BASE_URL = process.env.BASE_URL

export const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
export const RECAPTCHA_API_URL = process.env.RECAPTCHA_API_URL

export const EMAIL_USER = process.env.EMAIL_USER
export const EMAIL_PASS = process.env.EMAIL_PASS

export const JWT_SECRET = process.env.JWT_SECRET