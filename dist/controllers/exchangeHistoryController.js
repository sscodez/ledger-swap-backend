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
exports.getExchangeHistory = exports.createExchangeHistory = void 0;
const ExchangeHistory_1 = __importDefault(require("../models/ExchangeHistory"));
const createExchangeHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const authReq = req;
    const { exchangeId, status, from, to, fees, cashback } = req.body;
    try {
        const exchangeHistory = yield ExchangeHistory_1.default.create({
            user: authReq.user._id,
            exchangeId,
            status,
            from,
            to,
            fees,
            cashback,
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
const getExchangeHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const authReq = req;
    try {
        const exchangeHistory = yield ExchangeHistory_1.default.find({ user: authReq.user._id });
        res.json(exchangeHistory);
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
