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
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
const API_KEY = process.env.BINANCE_API_KEY;
const API_SECRET = process.env.BINANCE_API_SECRET;
const BASE_URL = "https://api.binance.com";
function signQuery(params) {
    const query = new URLSearchParams(params).toString();
    const signature = crypto_1.default.createHmac("sha256", API_SECRET).update(query).digest("hex");
    return query + "&signature=" + signature;
}
// Supported coins
const SUPPORTED_COINS = ["BTC", "IOTA", "XDC", "XRP", "XLM"];
/**
 * @openapi
 * /api/crypto/get-deposit/{coin}:
 *   get:
 *     summary: Get deposit address for chosen coin
 *     tags: [Crypto]
 *     parameters:
 *       - in: path
 *         name: coin
 *         required: true
 *         schema:
 *           type: string
 *           enum: [BTC, IOTA, XDC, XRP, XLM]
 *         description: The cryptocurrency symbol
 *     responses:
 *       '200':
 *         description: Deposit address retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 coin:
 *                   type: string
 *                 depositAddress:
 *                   type: string
 *                 tag:
 *                   type: string
 *                   nullable: true
 *       '400':
 *         description: Coin not supported
 *       '500':
 *         description: Server error
 */
router.get("/get-deposit/:coin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const coin = req.params.coin.toUpperCase();
        if (!SUPPORTED_COINS.includes(coin)) {
            return res.status(400).json({ error: "Coin not supported" });
        }
        const timestamp = Date.now();
        const query = signQuery({ coin, network: coin, timestamp });
        const result = yield axios_1.default.get(`${BASE_URL}/sapi/v1/capital/deposit/address?${query}`, {
            headers: { "X-MBX-APIKEY": API_KEY },
        });
        res.json({ coin, depositAddress: result.data.address, tag: result.data.tag || null });
    }
    catch (err) {
        res.status(500).json({ error: ((_a = err.response) === null || _a === void 0 ? void 0 : _a.data) || err.message });
    }
}));
/**
 * @openapi
 * /api/crypto/check-deposit/{coin}:
 *   get:
 *     summary: Check deposits for a specific coin
 *     tags: [Crypto]
 *     parameters:
 *       - in: path
 *         name: coin
 *         required: true
 *         schema:
 *           type: string
 *           enum: [BTC, IOTA, XDC, XRP, XLM]
 *         description: The cryptocurrency symbol
 *     responses:
 *       '200':
 *         description: Deposit history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deposits:
 *                   type: array
 *                   items:
 *                     type: object
 *       '500':
 *         description: Server error
 */
router.get("/check-deposit/:coin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const coin = req.params.coin.toUpperCase();
        const timestamp = Date.now();
        const query = signQuery({ coin, timestamp });
        const result = yield axios_1.default.get(`${BASE_URL}/sapi/v1/capital/deposit/hisrec?${query}`, {
            headers: { "X-MBX-APIKEY": API_KEY },
        });
        res.json({ deposits: result.data });
    }
    catch (err) {
        res.status(500).json({ error: ((_a = err.response) === null || _a === void 0 ? void 0 : _a.data) || err.message });
    }
}));
/**
 * @openapi
 * /api/crypto/swap-to-xrp:
 *   post:
 *     summary: Swap any supported coin to XRP
 *     tags: [Crypto]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fromAsset:
 *                 type: string
 *                 enum: [BTC, IOTA, XDC, XRP, XLM]
 *               amount:
 *                 type: number
 *             required: [fromAsset, amount]
 *     responses:
 *       '200':
 *         description: Swap successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 details:
 *                   type: object
 *       '400':
 *         description: Coin not supported
 *       '500':
 *         description: Server error
 */
router.post("/swap-to-xrp", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { fromAsset, amount } = req.body;
        if (!SUPPORTED_COINS.includes(fromAsset.toUpperCase())) {
            return res.status(400).json({ error: "Coin not supported" });
        }
        const timestamp = Date.now();
        // Get a quote
        const query1 = signQuery({
            fromAsset: fromAsset.toUpperCase(),
            toAsset: "XRP",
            fromAmount: amount,
            timestamp,
        });
        const quote = yield axios_1.default.post(`${BASE_URL}/sapi/v1/convert/getQuote?${query1}`, {}, {
            headers: { "X-MBX-APIKEY": API_KEY },
        });
        // Accept the quote
        const query2 = signQuery({
            quoteId: quote.data.quoteId,
            timestamp: Date.now(),
        });
        const convert = yield axios_1.default.post(`${BASE_URL}/sapi/v1/convert/acceptQuote?${query2}`, {}, {
            headers: { "X-MBX-APIKEY": API_KEY },
        });
        res.json({ message: "Swap successful", details: convert.data });
    }
    catch (err) {
        res.status(500).json({ error: ((_a = err.response) === null || _a === void 0 ? void 0 : _a.data) || err.message });
    }
}));
exports.default = router;
