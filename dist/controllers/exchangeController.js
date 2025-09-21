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
exports.updateExchangeStatus = exports.getExchangeById = exports.createExchange = void 0;
const ExchangeHistory_1 = __importDefault(require("../models/ExchangeHistory"));
function generateExchangeId() {
    return `EX-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}
// POST /api/exchanges
// Creates a new exchange entry and returns server-generated exchangeId (and the created record)
const createExchange = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const authReq = req;
    const { fromCurrency, toCurrency, sendAmount, receiveAmount, fees = 0, cashback = 0, walletAddress, status } = req.body || {};
    if (!fromCurrency || !toCurrency) {
        return res.status(400).json({ message: 'fromCurrency and toCurrency are required' });
    }
    const exchangeId = generateExchangeId();
    const allowedStatuses = new Set(['pending', 'completed', 'failed', 'in_review']);
    const computedStatus = allowedStatuses.has(String(status)) ? String(status) : 'pending';
    try {
        const record = yield ExchangeHistory_1.default.create({
            user: authReq.user._id,
            exchangeId,
            status: computedStatus,
            from: {
                currency: String(fromCurrency),
                amount: Number(sendAmount !== null && sendAmount !== void 0 ? sendAmount : 0),
            },
            to: {
                currency: String(toCurrency),
                amount: Number(receiveAmount !== null && receiveAmount !== void 0 ? receiveAmount : 0),
            },
            fees: Number(fees !== null && fees !== void 0 ? fees : 0),
            cashback: Number(cashback !== null && cashback !== void 0 ? cashback : 0),
            walletAddress: walletAddress ? String(walletAddress) : undefined,
        });
        return res.status(201).json({ exchangeId, record });
    }
    catch (err) {
        return res.status(500).json({ message: 'Failed to create exchange', error: (err === null || err === void 0 ? void 0 : err.message) || String(err) });
    }
});
exports.createExchange = createExchange;
// GET /api/exchanges/:exchangeId
const getExchangeById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { exchangeId } = req.params;
        const record = yield ExchangeHistory_1.default.findOne({ exchangeId });
        if (!record)
            return res.status(404).json({ message: 'Exchange not found' });
        return res.json(record);
    }
    catch (err) {
        return res.status(500).json({ message: 'Failed to fetch exchange', error: (err === null || err === void 0 ? void 0 : err.message) || String(err) });
    }
});
exports.getExchangeById = getExchangeById;
// PUT /api/exchanges/:exchangeId/status
const updateExchangeStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { exchangeId } = req.params;
        const { status } = req.body;
        const allowed = new Set(['pending', 'completed', 'failed', 'in_review']);
        if (!status || !allowed.has(String(status))) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        const updated = yield ExchangeHistory_1.default.findOneAndUpdate({ exchangeId }, { status: String(status) }, { new: true });
        if (!updated)
            return res.status(404).json({ message: 'Exchange not found' });
        return res.json(updated);
    }
    catch (err) {
        return res.status(500).json({ message: 'Failed to update status', error: (err === null || err === void 0 ? void 0 : err.message) || String(err) });
    }
});
exports.updateExchangeStatus = updateExchangeStatus;
