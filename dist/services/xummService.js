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
Object.defineProperty(exports, "__esModule", { value: true });
const xumm_sdk_1 = require("xumm-sdk");
const logger_1 = require("../utils/logger");
class XummService {
    constructor() {
        const apiKey = process.env.XUMM_API_KEY;
        const apiSecret = process.env.XUMM_API_SECRET;
        if (!apiKey || !apiSecret) {
            logger_1.logger.warn('XUMM SDK is not configured. Missing XUMM_API_KEY or XUMM_API_SECRET');
            this.sdk = null;
            return;
        }
        this.sdk = new xumm_sdk_1.XummSdk(apiKey, apiSecret);
        logger_1.logger.info('XUMM SDK initialized');
    }
    ensureConfigured() {
        if (!this.sdk) {
            throw new Error('XUMM SDK is not configured');
        }
    }
    createSignInPayload(account) {
        return __awaiter(this, void 0, void 0, function* () {
            this.ensureConfigured();
            const payload = yield this.sdk.payload.create({
                txjson: Object.assign({ TransactionType: 'SignIn' }, (account ? { Account: account } : {})),
            });
            return {
                uuid: payload.uuid,
                next: payload.next.always,
                qrPng: payload.refs.qr_png,
                qrSvg: payload.refs.qr_svg,
                websocketStatus: payload.refs.websocket_status,
                pushed: payload.pushed,
                expiresAt: payload.expires_at,
            };
        });
    }
    getPayloadStatus(uuid) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            this.ensureConfigured();
            const payload = yield this.sdk.payload.get(uuid);
            return {
                uuid: payload.uuid,
                signed: payload.meta.signed === true,
                cancelled: payload.meta.cancelled === true,
                expired: payload.meta.expired === true,
                account: (_a = payload.response) === null || _a === void 0 ? void 0 : _a.account,
                txid: (_b = payload.response) === null || _b === void 0 ? void 0 : _b.txid,
                expiresAt: payload.expires_at || payload.meta.expires_at,
            };
        });
    }
}
exports.default = new XummService();
