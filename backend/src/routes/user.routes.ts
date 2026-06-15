import { Router } from 'express';
import { getUsers, searchUsers } from '../controllers/user.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.get('/', getUsers);
router.get('/search', searchUsers);

export default router;
