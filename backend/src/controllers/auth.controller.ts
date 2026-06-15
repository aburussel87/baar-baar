import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../utils/prisma';
import { generateToken } from '../utils/token';
import { AuthRequest } from '../middleware/auth.middleware';
import { generateOTP, sendOTPEmail } from '../utils/mailer';
import { verifyGoogleToken } from '../utils/googleAuth';

const createAndSendOtp = async (userId: string, email: string) => {
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.otp.deleteMany({
    where: { userId, type: 'VERIFY_EMAIL' },
  });

  await prisma.otp.create({
    data: {
      userId,
      code: otp,
      type: 'VERIFY_EMAIL',
      expiresAt,
    },
  });

  return sendOTPEmail(email, otp);
};

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, publicKey } = req.body;

    let user = await prisma.user.findUnique({ where: { email } });
    if (user && user.isVerified) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

    if (user && !user.isVerified) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name, password: hashedPassword, avatar, authProvider: 'LOCAL', publicKey: publicKey || null },
      });
    } else {
      user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          avatar,
          authProvider: 'LOCAL',
          isVerified: false,
          publicKey: publicKey || null,
        },
      });
    }

    const emailResult = await createAndSendOtp(user.id, email);

    res.status(201).json({
      success: true,
      message: emailResult.message,
      emailSent: emailResult.sent,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const resendOtp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'Email is already verified' });
    }

    const emailResult = await createAndSendOtp(user.id, email);

    res.json({
      success: true,
      message: emailResult.message,
      emailSent: emailResult.sent,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, code, publicKey } = req.body;
    const normalizedCode = String(code).trim();
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const otpRecord = await prisma.otp.findFirst({
      where: {
        userId: user.id,
        code: normalizedCode,
        type: 'VERIFY_EMAIL',
        expiresAt: { gt: new Date() }
      }
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        ...(publicKey ? { publicKey } : {}),
      },
    });

    await prisma.otp.deleteMany({ where: { userId: user.id, type: 'VERIFY_EMAIL' } });

    const token = generateToken(updatedUser.id, updatedUser.email);

    res.json({
      success: true,
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        publicKey: updatedUser.publicKey,
        token,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, publicKey } = req.body;

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.authProvider !== 'LOCAL' || !user.password) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(401).json({ success: false, message: 'Please verify your email first', code: 'UNVERIFIED' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (publicKey && user.publicKey !== publicKey) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { publicKey }
      });
    }

    const token = generateToken(user.id, user.email);

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        publicKey: user.publicKey,
        token,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { token, publicKey } = req.body;
    const payload = await verifyGoogleToken(token);
    
    if (!payload || !payload.email) {
      return res.status(401).json({ success: false, message: 'Invalid Google token' });
    }

    let user = await prisma.user.findUnique({ where: { email: payload.email } });

    if (user) {
      if (user.authProvider === 'LOCAL') {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: payload.sub,
            isVerified: true,
            ...(publicKey ? { publicKey } : {})
          }
        });
      } else {
        if (publicKey && user.publicKey !== publicKey) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { publicKey }
          });
        }
      }
    } else {
      user = await prisma.user.create({
        data: {
          name: payload.name || 'User',
          email: payload.email,
          avatar: payload.picture,
          authProvider: 'GOOGLE',
          googleId: payload.sub,
          isVerified: true,
          publicKey: publicKey || null,
        }
      });
    }

    const jwtToken = generateToken(user.id, user.email);

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        publicKey: user.publicKey,
        token: jwtToken,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        publicKey: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
