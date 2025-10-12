"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const contactController_1 = require("../controllers/contactController");
const router = (0, express_1.Router)();
// Public route - anyone can submit contact form
router.post('/', contactController_1.createContact);
// Protected routes - admin only
router.get('/', authMiddleware_1.protect, contactController_1.getAllContacts);
router.put('/:id/status', authMiddleware_1.protect, contactController_1.updateContactStatus);
router.post('/:id/escalate', authMiddleware_1.protect, contactController_1.escalateToDispute);
exports.default = router;
