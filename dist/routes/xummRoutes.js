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
const express_1 = require("express");
const xummService_1 = __importDefault(require("../services/xummService"));
const router = (0, express_1.Router)();
router.post('/connect', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { account } = req.body || {};
        const payload = yield xummService_1.default.createSignInPayload(account);
        return res.json(payload);
    }
    catch (error) {
        if (error.message === 'XUMM SDK is not configured') {
            return res.status(503).json({
                success: false,
                message: 'XUMM integration is not configured. Please set XUMM_API_KEY and XUMM_API_SECRET.',
            });
        }
        console.error('Failed to create XUMM payload:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create XUMM payload',
            error: error.message,
        });
    }
}));
router.get('/status/:uuid', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { uuid } = req.params;
        const status = yield xummService_1.default.getPayloadStatus(uuid);
        return res.json(status);
    }
    catch (error) {
        if (error.message === 'XUMM SDK is not configured') {
            return res.status(503).json({
                success: false,
                message: 'XUMM integration is not configured. Please set XUMM_API_KEY and XUMM_API_SECRET.',
            });
        }
        console.error('Failed to retrieve XUMM payload status:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve XUMM payload status',
            error: error.message,
        });
    }
}));
exports.default = router;
