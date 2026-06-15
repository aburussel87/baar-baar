import nodemailer from 'nodemailer';
import { env } from '../config/env';
import dns from 'dns';

// Force Node.js to use IPv4 first for DNS resolution
// This prevents ENETUNREACH errors on platforms like Render that have broken IPv6
dns.setDefaultResultOrder('ipv4first');

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const isSmtpConfigured = () => Boolean(env.SMTP_USER && env.SMTP_PASS);

export type SendOtpResult = {
  sent: boolean;
  devLogged: boolean;
  message: string;
};

export const sendOTPEmail = async (email: string, otp: string): Promise<SendOtpResult> => {
  if (env.NODE_ENV !== 'production') {
    console.log('\n========================================');
    console.log(`OTP for ${email}: ${otp}`);
    console.log('Expires in 10 minutes');
    console.log('========================================\n');
  }

  if (!isSmtpConfigured()) {
    const message =
      env.NODE_ENV === 'production'
        ? 'Email service is not configured. Contact support.'
        : 'SMTP not configured — use the OTP printed in the server console.';

    if (env.NODE_ENV === 'production') {
      console.error('SMTP_USER/SMTP_PASS missing — cannot send OTP email');
    }

    return { sent: false, devLogged: env.NODE_ENV !== 'production', message };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE ?? false,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
      ...({ family: 4 } as any),
    });

    await transporter.verify();

    await transporter.sendMail({
      from: env.SMTP_FROM || env.SMTP_USER,
      to: email,
      subject: 'Chat App - Verify your email',
      text: `Your verification code is: ${otp}\n\nIt will expire in 10 minutes.`,
      html: `<p>Your verification code is: <strong>${otp}</strong></p><p>It will expire in 10 minutes.</p>`,
    });

    console.log(`OTP email sent to ${email}`);
    return {
      sent: true,
      devLogged: false,
      message: 'Verification code sent. Please check your email.',
    };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return {
      sent: false,
      devLogged: env.NODE_ENV !== 'production',
      message:
        env.NODE_ENV === 'production'
          ? 'Failed to send verification email. Please try resending the code.'
          : 'Email failed — use the OTP printed in the server console.',
    };
  }
};
