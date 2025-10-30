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
        this.sdk = null;
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
    getSdk() {
        if (!this.sdk) {
            throw new Error('XUMM SDK is not configured');
        }
        return this.sdk;
    }
    createSignInPayload(account) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const sdk = this.getSdk();
            const payload = yield sdk.payload.create({
                txjson: Object.assign({ TransactionType: 'SignIn' }, (account ? { Account: account } : {})),
            });
            if (!payload) {
                throw new Error('Failed to create XUMM sign-in payload');
            }
            const nextSection = (_a = payload.next) !== null && _a !== void 0 ? _a : {};
            const nextUrl = typeof nextSection.always === 'string' ? nextSection.always : '';
            const refs = (_b = payload.refs) !== null && _b !== void 0 ? _b : {};
            const qrSvg = refs.qr_svg;
            const expiresAt = payload.expires_at;
            if (!(refs === null || refs === void 0 ? void 0 : refs.qr_png)) {
                throw new Error('XUMM payload missing QR PNG reference');
            }
            return {
                uuid: (_c = payload.uuid) !== null && _c !== void 0 ? _c : '',
                next: nextUrl,
                qrPng: refs.qr_png,
                qrSvg,
                websocketStatus: refs.websocket_status,
                pushed: (_d = payload.pushed) !== null && _d !== void 0 ? _d : false,
                expiresAt,
            };
        });
    }
    getPayloadStatus(uuid) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            const sdk = this.getSdk();
            const payload = yield sdk.payload.get(uuid);
            if (!payload) {
                throw new Error('Failed to retrieve XUMM payload status');
            }
            const meta = (_a = payload.meta) !== null && _a !== void 0 ? _a : {};
            const response = (_b = payload.response) !== null && _b !== void 0 ? _b : {};
            const expiresAt = (_c = payload.expires_at) !== null && _c !== void 0 ? _c : undefined;
            const payloadUuid = (_d = payload.uuid) !== null && _d !== void 0 ? _d : uuid;
            return {
                uuid: payloadUuid,
                signed: meta.signed === true,
                cancelled: meta.cancelled === true,
                expired: meta.expired === true,
                account: (_e = response.account) !== null && _e !== void 0 ? _e : null,
                txid: (_f = response.txid) !== null && _f !== void 0 ? _f : null,
                expiresAt,
            };
        });
    }
}
exports.default = new XummService();
