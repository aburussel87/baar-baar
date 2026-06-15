import { Router } from 'express';
import { z } from 'zod';
import { register, login, getMe, verifyOtp, resendOtp, googleLogin } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { protect } from '../middleware/auth.middleware';

const router = Router();

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    publicKey: z.string().optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
    publicKey: z.string().optional(),
  }),
});

const verifyOtpSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    code: z.string().min(6, 'OTP must be 6 characters'),
    publicKey: z.string().optional(),
  }),
});

const resendOtpSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
});

const googleLoginSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Google token is required'),
    publicKey: z.string().optional(),
  }),
});

router.post('/register', validateRequest(registerSchema), register);
router.post('/verify-otp', validateRequest(verifyOtpSchema), verifyOtp);
router.post('/resend-otp', validateRequest(resendOtpSchema), resendOtp);
router.post('/login', validateRequest(loginSchema), login);
router.post('/google', validateRequest(googleLoginSchema), googleLogin);
router.get('/me', protect, getMe);

export default router;
