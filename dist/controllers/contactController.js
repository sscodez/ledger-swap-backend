"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.escalateToDispute = exports.updateContactStatus = exports.getAllContacts = exports.createContact = void 0;
const axios_1 = __importDefault(require("axios"));
const Contact_1 = __importDefault(require("../models/Contact"));
const Dispute_1 = __importDefault(require("../models/Dispute"));
const emailService_1 = require("../services/emailService");
// POST /api/contacts - Create a new contact submission
const createContact = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, subject, message, category = 'general', recaptchaToken } = req.body;
        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                message: 'Name, email, subject, and message are required'
            });
        }
        const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
        if (recaptchaSecret) {
            if (!recaptchaToken) {
                return res.status(400).json({ message: 'reCAPTCHA verification failed. Please try again.' });
            }
            try {
                const verifyResponse = yield axios_1.default.post('https://www.google.com/recaptcha/api/siteverify', null, {
                    params: {
                        secret: recaptchaSecret,
                        response: recaptchaToken
                    }
                });
                if (!verifyResponse.data.success) {
                    return res.status(400).json({ message: 'reCAPTCHA verification failed. Please try again.' });
                }
            }
            catch (captchaError) {
                console.error('reCAPTCHA verification error:', captchaError);
                return res.status(500).json({ message: 'Failed to verify reCAPTCHA. Please try again later.' });
            }
        }
        // Determine if this should be treated as a dispute based on category or keywords
        const disputeKeywords = ['dispute', 'problem', 'issue', 'complaint', 'refund', 'lost', 'stolen', 'fraud'];
        const isDispute = category === 'security' || category === 'trading' ||
            disputeKeywords.some(keyword => subject.toLowerCase().includes(keyword) ||
                message.toLowerCase().includes(keyword));
        // Set priority based on category and dispute status
        let priority = 'medium';
        if (isDispute || category === 'security') {
            priority = 'high';
        }
        else if (category === 'technical' || category === 'billing') {
            priority = 'medium';
        }
        else {
            priority = 'low';
        }
        const contact = yield Contact_1.default.create({
            name,
            email,
            subject,
            message,
            category,
            priority,
            isDispute,
            status: 'open'
        });
        // Send corridor confirmation email to the user
        try {
            yield (0, emailService_1.sendCorridorConfirmationEmail)(email, name);
            console.log('Corridor confirmation email sent to:', email);
        }
        catch (emailError) {
            console.error('Failed to send corridor confirmation email:', emailError);
            // Don't fail the contact creation if email fails
        }
        return res.status(201).json({
            message: 'Contact submission received successfully',
            contact: {
                id: contact._id,
                isDispute: contact.isDispute,
                priority: contact.priority,
                status: contact.status
            }
        });
    }
    catch (error) {
        console.error('Error creating contact:', error);
        return res.status(500).json({
            message: 'Failed to submit contact form',
            error: error.message
        });
    }
});
exports.createContact = createContact;
// GET /api/contacts - Get all contact submissions (admin only)
const getAllContacts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 20, status, category, priority, disputesOnly } = req.query;
        const filter = {};
        if (status)
            filter.status = status;
        if (category)
            filter.category = category;
        if (priority)
            filter.priority = priority;
        if (disputesOnly === 'true')
            filter.isDispute = true;
        const contacts = yield Contact_1.default.find(filter)
            .populate('assignedTo', 'name email')
            .populate('disputeId')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        const total = yield Contact_1.default.countDocuments(filter);
        return res.json({
            contacts,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('Error fetching contacts:', error);
        return res.status(500).json({
            message: 'Failed to fetch contacts',
            error: error.message
        });
    }
});
exports.getAllContacts = getAllContacts;
// PUT /api/contacts/:id/status - Update contact status
const updateContactStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { status, assignedTo, response } = req.body;
        const authReq = req;
        const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        const updateData = {};
        if (status)
            updateData.status = status;
        if (assignedTo)
            updateData.assignedTo = assignedTo;
        // Add response if provided
        if (response && authReq.user) {
            updateData.$push = {
                responses: {
                    message: response,
                    respondedBy: authReq.user._id,
                    respondedAt: new Date()
                }
            };
        }
        const contact = yield Contact_1.default.findByIdAndUpdate(id, updateData, { new: true })
            .populate('assignedTo', 'name email')
            .populate('responses.respondedBy', 'name email');
        if (!contact) {
            return res.status(404).json({ message: 'Contact not found' });
        }
        return res.json(contact);
    }
    catch (error) {
        console.error('Error updating contact:', error);
        return res.status(500).json({
            message: 'Failed to update contact',
            error: error.message
        });
    }
});
exports.updateContactStatus = updateContactStatus;
// POST /api/contacts/:id/escalate - Escalate contact to dispute
const escalateToDispute = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { exchangeId, userId } = req.body;
        const authReq = req;
        if (!exchangeId || !userId) {
            return res.status(400).json({
                message: 'Exchange ID and User ID are required for dispute escalation'
            });
        }
        const contact = yield Contact_1.default.findById(id);
        if (!contact) {
            return res.status(404).json({ message: 'Contact not found' });
        }
        if (contact.disputeId) {
            return res.status(400).json({ message: 'Contact already escalated to dispute' });
        }
        // Create dispute from contact
        const dispute = yield Dispute_1.default.create({
            user: userId,
            exchangeId,
            subject: contact.subject,
            description: `Escalated from contact submission:\n\n${contact.message}`,
            status: 'open',
            messages: [{
                    senderType: 'user',
                    message: contact.message,
                    createdAt: contact.createdAt
                }]
        });
        // Update contact with dispute reference
        contact.disputeId = dispute._id;
        contact.isDispute = true;
        contact.status = 'in_progress';
        yield contact.save();
        return res.json({
            message: 'Contact escalated to dispute successfully',
            disputeId: dispute._id,
            contact
        });
    }
    catch (error) {
        console.error('Error escalating to dispute:', error);
        return res.status(500).json({
            message: 'Failed to escalate to dispute',
            error: error.message
        });
    }
});
exports.escalateToDispute = escalateToDispute;
