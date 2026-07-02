import nodemailer from "nodemailer";
import { config } from "../config.js";

export async function sendEmail(to: string, subject: string, text: string) {
  if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS) return false;
  const transport = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_PORT === 465,
    auth: { user: config.SMTP_USER, pass: config.SMTP_PASS }
  });
  await transport.sendMail({ from: config.SMTP_FROM, to, subject, text });
  return true;
}

