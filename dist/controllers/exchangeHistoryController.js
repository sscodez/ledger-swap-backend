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
exports.getExchangeHistory = exports.updateExchangeHistory = exports.createExchangeHistory = void 0;
const ExchangeHistory_1 = __importDefault(require("../models/ExchangeHistory"));
const createExchangeHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const authReq = req;
    const { exchangeId, status, from, to, fees, cashback, sellerTxhash, depositAddressSeller, prefundTxHash, buyerTxhash, depositAddressBuyer, withdrawalTxId, sendAddressSeller, sendAddressBuyer, } = req.body;
    try {
        const exchangeHistory = yield ExchangeHistory_1.default.create({
            user: authReq.user._id,
            exchangeId,
            status,
            from,
            to,
            fees,
            cashback,
            sellerTxhash,
            depositAddressSeller,
            prefundTxHash,
            sendAddressSeller,
        });
        res.status(201).json(exchangeHistory);
    }
    catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
        else {
            res.status(500).json({ message: 'An unknown error occurred' });
        }
    }
});
exports.createExchangeHistory = createExchangeHistory;
const updateExchangeHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const authReq = req;
    const { id } = req.params;
    try {
        if (!id) {
            return res.status(400).json({ message: 'Exchange history ID is required' });
        }
        const allowedFields = [
            'status',
            'fees',
            'cashback',
            'buyerTxhash',
            'sellerTxhash',
            'depositAddressBuyer',
            'depositAddressSeller',
            'prefundTxHash',
            'withdrawalTxId',
            'sendAddressSeller',
            'sendAddressBuyer',
        ];
        const updates = {};
        for (const field of allowedFields) {
            if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                updates[field] = req.body[field];
            }
        }
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: 'No valid fields provided for update' });
        }
        const filter = { _id: id };
        if ((_a = authReq.user) === null || _a === void 0 ? void 0 : _a._id) {
            filter.user = authReq.user._id;
        }
        const updated = yield ExchangeHistory_1.default.findOneAndUpdate(filter, updates, {
            new: true,
            runValidators: true,
        });
        if (!updated) {
            return res.status(404).json({ message: 'Exchange history entry not found' });
        }
        res.json(updated);
    }
    catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
        else {
            res.status(500).json({ message: 'An unknown error occurred' });
        }
    }
});
exports.updateExchangeHistory = updateExchangeHistory;
const getExchangeHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const authReq = req;
    try {
        const { page = '1', limit = '10', sort = '-createdAt' } = req.query;
        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const limitNum = Math.max(Math.min(parseInt(limit, 10) || 10, 100), 1);
        const [items, total] = yield Promise.all([
            ExchangeHistory_1.default.find({ user: authReq.user._id })
                .sort(sort)
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum),
            ExchangeHistory_1.default.countDocuments({ user: authReq.user._id }),
        ]);
        res.json({
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
            items,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
        else {
            res.status(500).json({ message: 'An unknown error occurred' });
        }
    }
});
exports.getExchangeHistory = getExchangeHistory;
