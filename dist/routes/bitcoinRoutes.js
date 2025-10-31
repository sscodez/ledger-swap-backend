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
const express_1 = __importDefault(require("express"));
const bitcoinService_1 = __importDefault(require("../services/blockchains/bitcoinService"));
const router = express_1.default.Router();
/**
 * Build an unsigned PSBT for sending BTC from a user's address to an admin address.
 * Body: { fromAddress: string, toAddress: string, amountBTC: number, feeRate?: number }
 * Returns: { psbtBase64: string, inputs: number, changeSat: number, network: 'mainnet'|'testnet' }
 */
router.post('/prefund/build-psbt', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { fromAddress, toAddress, amountBTC, feeRate } = req.body || {};
        if (!fromAddress || !toAddress || !amountBTC) {
            return res.status(400).json({ message: 'Missing required fields: fromAddress, toAddress, amountBTC' });
        }
        const result = yield bitcoinService_1.default.buildUnsignedPsbt(fromAddress, toAddress, Number(amountBTC), Number(feeRate) || 10);
        return res.json(result);
    }
    catch (err) {
        console.error('❌ build-psbt error:', err);
        return res.status(500).json({ message: (err === null || err === void 0 ? void 0 : err.message) || 'Failed to build PSBT' });
    }
}));
/**
 * Broadcast a signed PSBT
 * Body: { signedPsbtBase64: string }
 * Returns: { txid: string }
 */
router.post('/broadcast-psbt', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { signedPsbtBase64 } = req.body || {};
        if (!signedPsbtBase64) {
            return res.status(400).json({ message: 'Missing signedPsbtBase64' });
        }
        const txid = yield bitcoinService_1.default.finalizeAndBroadcastSignedPsbt(signedPsbtBase64);
        return res.json({ txid });
    }
    catch (err) {
        console.error('❌ broadcast-psbt error:', err);
        return res.status(500).json({ message: (err === null || err === void 0 ? void 0 : err.message) || 'Failed to broadcast PSBT' });
    }
}));
exports.default = router;
