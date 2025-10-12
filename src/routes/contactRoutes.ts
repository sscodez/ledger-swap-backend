import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import {
  createContact,
  getAllContacts,
  updateContactStatus,
  escalateToDispute
} from '../controllers/contactController';

const router = Router();

// Public route - anyone can submit contact form
router.post('/', createContact);

// Protected routes - admin only
router.get('/', protect, getAllContacts);
router.put('/:id/status', protect, updateContactStatus);
router.post('/:id/escalate', protect, escalateToDispute);

export default router;
