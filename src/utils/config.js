import dotenv from "dotenv";
dotenv.config();

export const BASE_URL = process.env.BASE_URL;

export const DATABASE_URL = process.env.DATABASE_URL;
export const DATABASE_HOST = process.env.DATABASE_HOST;
export const DATABASE_NAME = process.env.DATABASE_NAME;
export const DATABASE_USER = process.env.DATABASE_USER;
export const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD;

export const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
export const RECAPTCHA_API_URL = process.env.RECAPTCHA_API_URL;

export const EMAIL_USER = process.env.EMAIL_USER;
export const EMAIL_PASS = process.env.EMAIL_PASS;

export const JWT_SECRET = process.env.JWT_SECRET;

export const MFA_SECRET = process.env.MFA_SECRET;

export const IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY;
export const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;
export const IMAGEKIT_URL_ENDPOINT = process.env.IMAGEKIT_URL_ENDPOINT;
