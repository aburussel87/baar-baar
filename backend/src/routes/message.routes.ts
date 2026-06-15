import { Router } from 'express';
import { z } from 'zod';
import { getMessages, sendMessage, markMessageAsRead } from '../controllers/message.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

const sendMessageSchema = z.object({
  body: z.object({
    conversationId: z.string().uuid(),
    body: z.string().min(1, 'Message cannot be empty'),
    type: z.enum(['TEXT', 'IMAGE', 'FILE']).optional(),
  }),
});

router.get('/:conversationId', getMessages);
router.post('/', validateRequest(sendMessageSchema), sendMessage);
router.patch('/:id/read', markMessageAsRead);

export default router;
