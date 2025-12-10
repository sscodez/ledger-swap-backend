import { Router } from 'express';
import { protect, isAdmin } from '../middleware/authMiddleware';
import { listIntentLogs, logMirrorIntent, getGuardianStatusesHandler } from '../controllers/intentLogController';

const router = Router();

router.get('/', protect, isAdmin, listIntentLogs);
router.get('/guardians', protect, isAdmin, getGuardianStatusesHandler);
router.post('/mirror', logMirrorIntent);

export default router;
