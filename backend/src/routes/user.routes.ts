import { Router } from 'express';
import { z } from 'zod';
import { getUsers, searchUsers, updateProfile, updatePassword } from '../controllers/user.controller';
import { protect } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';

const router = Router();

const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    avatar: z.string().url('Avatar must be a valid URL').optional(),
  }),
});

const updatePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  }),
});

router.use(protect);

router.get('/', getUsers);
router.get('/search', searchUsers);
router.put('/profile', validateRequest(updateProfileSchema), updateProfile);
router.put('/password', validateRequest(updatePasswordSchema), updatePassword);

export default router;
