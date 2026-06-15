import { Router } from 'express';
import { z } from 'zod';
import { getConversations, createConversation, getConversationById, createGroupConversation, leaveGroup, clearConversation } from '../controllers/conversation.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

const createConvSchema = z.object({
  body: z.object({
    participantId: z.string().uuid('Invalid user ID'),
  }),
});

const createGroupSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Group name is required'),
    participantIds: z.array(z.string().uuid('Invalid user ID')).min(2, 'At least 2 other participants required'),
  }),
});

router.get('/', getConversations);
router.post('/group', validateRequest(createGroupSchema), createGroupConversation);
router.post('/', validateRequest(createConvSchema), createConversation);
router.get('/:id', getConversationById);
router.delete('/:id/leave', leaveGroup);
router.delete('/:id/clear', clearConversation);

export default router;
