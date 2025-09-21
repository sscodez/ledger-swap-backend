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
exports.adminReplyToDispute = exports.adminUpdateDisputeStatus = exports.adminListDisputes = exports.addMessageToDispute = exports.getDisputeById = exports.listMyDisputes = exports.createDispute = void 0;
const Dispute_1 = __importDefault(require("../models/Dispute"));
// User: create a dispute
const createDispute = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { exchangeId, subject, description, attachments } = req.body;
        if (!exchangeId || !subject || !description) {
            return res.status(400).json({ message: 'exchangeId, subject and description are required' });
        }
        const authReq = req;
        const dispute = yield Dispute_1.default.create({
            user: authReq.user._id,
            exchangeId,
            subject,
            description,
            attachments: attachments || [],
        });
        res.status(201).json(dispute);
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to create dispute', error: err.message });
    }
});
exports.createDispute = createDispute;
// User: list my disputes
const listMyDisputes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = '1', limit = '20', status } = req.query;
        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const limitNum = Math.max(Math.min(parseInt(limit, 10) || 20, 100), 1);
        const authReq = req;
        const query = { user: authReq.user._id };
        if (status)
            query.status = status;
        const [items, total] = yield Promise.all([
            Dispute_1.default.find(query).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
            Dispute_1.default.countDocuments(query),
        ]);
        res.json({ page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum), items });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to list disputes', error: err.message });
    }
});
exports.listMyDisputes = listMyDisputes;
// User/Admin: get dispute by id (owner or admin)
const getDisputeById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const dispute = yield Dispute_1.default.findById(id);
        if (!dispute)
            return res.status(404).json({ message: 'Dispute not found' });
        const authReq = req;
        const isOwner = dispute.user.toString() === authReq.user._id.toString();
        const isAdmin = ((_a = authReq.user) === null || _a === void 0 ? void 0 : _a.role) === 'admin';
        if (!isOwner && !isAdmin)
            return res.status(403).json({ message: 'Access denied' });
        res.json(dispute);
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to get dispute', error: err.message });
    }
});
exports.getDisputeById = getDisputeById;
// User/Admin: add message to a dispute (owner or admin)
const addMessageToDispute = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const { message } = req.body;
        if (!message)
            return res.status(400).json({ message: 'message is required' });
        const dispute = yield Dispute_1.default.findById(id);
        if (!dispute)
            return res.status(404).json({ message: 'Dispute not found' });
        const authReq = req;
        const isOwner = dispute.user.toString() === String(authReq.user._id);
        const isAdmin = ((_a = authReq.user) === null || _a === void 0 ? void 0 : _a.role) === 'admin';
        if (!isOwner && !isAdmin)
            return res.status(403).json({ message: 'Access denied' });
        dispute.messages.push({ senderType: isAdmin ? 'admin' : 'user', message });
        yield dispute.save();
        res.json(dispute);
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to add message', error: err.message });
    }
});
exports.addMessageToDispute = addMessageToDispute;
// Admin: list disputes with filters
const adminListDisputes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = '1', limit = '20', status, exchangeId, user } = req.query;
        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const limitNum = Math.max(Math.min(parseInt(limit, 10) || 20, 100), 1);
        const query = {};
        if (status)
            query.status = status;
        if (exchangeId)
            query.exchangeId = exchangeId;
        if (user)
            query.user = user;
        const [items, total] = yield Promise.all([
            Dispute_1.default.find(query).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
            Dispute_1.default.countDocuments(query),
        ]);
        res.json({ page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum), items });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to list disputes', error: err.message });
    }
});
exports.adminListDisputes = adminListDisputes;
// Admin: update dispute status
const adminUpdateDisputeStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['open', 'in_review', 'resolved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        const dispute = yield Dispute_1.default.findByIdAndUpdate(id, { status }, { new: true });
        if (!dispute)
            return res.status(404).json({ message: 'Dispute not found' });
        res.json(dispute);
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to update dispute status', error: err.message });
    }
});
exports.adminUpdateDisputeStatus = adminUpdateDisputeStatus;
// Admin: reply to a dispute (adds message as admin)
const adminReplyToDispute = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { message } = req.body;
        if (!message)
            return res.status(400).json({ message: 'message is required' });
        const dispute = yield Dispute_1.default.findById(id);
        if (!dispute)
            return res.status(404).json({ message: 'Dispute not found' });
        dispute.messages.push({ senderType: 'admin', message });
        yield dispute.save();
        res.json(dispute);
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to reply to dispute', error: err.message });
    }
});
exports.adminReplyToDispute = adminReplyToDispute;
