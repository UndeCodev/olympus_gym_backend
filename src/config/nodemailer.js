import nodemailer from 'nodemailer';

import { EMAIL_USER, EMAIL_PASS } from '../utils/config.js';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  port: 465,
  secure: true,
  auth: {
    user: EMAIL_USER, 
    pass: EMAIL_PASS,
  },
});

export default transporter;