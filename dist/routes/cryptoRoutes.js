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
 * /api/crypto/swap:
 *   post:
 *     summary: Swap between supported coins
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
 *               toAsset:
 *                 type: string
 *                 enum: [BTC, IOTA, XDC, XRP, XLM]
 *               amount:
 *                 type: number
 *             required: [fromAsset, toAsset, amount]
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
 *         description: Coin not supported or invalid swap
 *       '500':
 *         description: Server error
 */
router.post("/swap", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { fromAsset, toAsset, amount } = req.body;
        if (!SUPPORTED_COINS.includes(fromAsset.toUpperCase()) || !SUPPORTED_COINS.includes(toAsset.toUpperCase())) {
            return res.status(400).json({ error: "Coin not supported" });
        }
        if (fromAsset.toUpperCase() === toAsset.toUpperCase()) {
            return res.status(400).json({ error: "Cannot swap to the same asset" });
        }
        const timestamp = Date.now();
        // Get a quote
        const query1 = signQuery({
            fromAsset: fromAsset.toUpperCase(),
            toAsset: toAsset.toUpperCase(),
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
/**
 * @openapi
 * /api/crypto/withdraw:
 *   post:
 *     summary: Withdraw coins to user's wallet address
 *     tags: [Crypto]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               coin:
 *                 type: string
 *                 enum: [BTC, IOTA, XDC, XRP, XLM]
 *               amount:
 *                 type: number
 *               address:
 *                 type: string
 *               tag:
 *                 type: string
 *                 description: Required for XRP and XLM
 *               network:
 *                 type: string
 *                 description: Network to use for withdrawal
 *             required: [coin, amount, address]
 *     responses:
 *       '200':
 *         description: Withdrawal successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 withdrawalId:
 *                   type: string
 *       '400':
 *         description: Invalid parameters
 *       '500':
 *         description: Server error
 */
router.post("/withdraw", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { coin, amount, address, tag, network } = req.body;
        if (!SUPPORTED_COINS.includes(coin.toUpperCase())) {
            return res.status(400).json({ error: "Coin not supported" });
        }
        if (!address) {
            return res.status(400).json({ error: "Withdrawal address is required" });
        }
        const timestamp = Date.now();
        const withdrawParams = {
            coin: coin.toUpperCase(),
            amount,
            address,
            timestamp,
        };
        // Add network if provided
        if (network) {
            withdrawParams.network = network;
        }
        // Add tag for coins that require it (XRP, XLM)
        if (tag && (coin.toUpperCase() === 'XRP' || coin.toUpperCase() === 'XLM')) {
            withdrawParams.addressTag = tag;
        }
        const query = signQuery(withdrawParams);
        const result = yield axios_1.default.post(`${BASE_URL}/sapi/v1/capital/withdraw/apply?${query}`, {}, {
            headers: { "X-MBX-APIKEY": API_KEY },
        });
        res.json({
            message: "Withdrawal initiated successfully",
            withdrawalId: result.data.id
        });
    }
    catch (err) {
        res.status(500).json({ error: ((_a = err.response) === null || _a === void 0 ? void 0 : _a.data) || err.message });
    }
}));
/**
 * @openapi
 * /api/crypto/swap-and-withdraw:
 *   post:
 *     summary: Complete flow - swap coins and withdraw to user address
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
 *               toAsset:
 *                 type: string
 *                 enum: [BTC, IOTA, XDC, XRP, XLM]
 *               amount:
 *                 type: number
 *               withdrawalAddress:
 *                 type: string
 *               withdrawalTag:
 *                 type: string
 *                 description: Required for XRP and XLM withdrawals
 *               network:
 *                 type: string
 *                 description: Network to use for withdrawal
 *             required: [fromAsset, toAsset, amount, withdrawalAddress]
 *     responses:
 *       '200':
 *         description: Swap and withdrawal successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 swapDetails:
 *                   type: object
 *                 withdrawalId:
 *                   type: string
 *       '400':
 *         description: Invalid parameters
 *       '500':
 *         description: Server error
 */
router.post("/swap-and-withdraw", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { fromAsset, toAsset, amount, withdrawalAddress, withdrawalTag, network } = req.body;
        if (!SUPPORTED_COINS.includes(fromAsset.toUpperCase()) || !SUPPORTED_COINS.includes(toAsset.toUpperCase())) {
            return res.status(400).json({ error: "Coin not supported" });
        }
        if (fromAsset.toUpperCase() === toAsset.toUpperCase()) {
            return res.status(400).json({ error: "Cannot swap to the same asset" });
        }
        if (!withdrawalAddress) {
            return res.status(400).json({ error: "Withdrawal address is required" });
        }
        // Step 1: Perform the swap
        const timestamp1 = Date.now();
        const query1 = signQuery({
            fromAsset: fromAsset.toUpperCase(),
            toAsset: toAsset.toUpperCase(),
            fromAmount: amount,
            timestamp: timestamp1,
        });
        const quote = yield axios_1.default.post(`${BASE_URL}/sapi/v1/convert/getQuote?${query1}`, {}, {
            headers: { "X-MBX-APIKEY": API_KEY },
        });
        const query2 = signQuery({
            quoteId: quote.data.quoteId,
            timestamp: Date.now(),
        });
        const convert = yield axios_1.default.post(`${BASE_URL}/sapi/v1/convert/acceptQuote?${query2}`, {}, {
            headers: { "X-MBX-APIKEY": API_KEY },
        });
        // Step 2: Withdraw the converted amount
        const timestamp2 = Date.now();
        const withdrawParams = {
            coin: toAsset.toUpperCase(),
            amount: convert.data.toAmount || quote.data.toAmount,
            address: withdrawalAddress,
            timestamp: timestamp2,
        };
        if (network) {
            withdrawParams.network = network;
        }
        if (withdrawalTag && (toAsset.toUpperCase() === 'XRP' || toAsset.toUpperCase() === 'XLM')) {
            withdrawParams.addressTag = withdrawalTag;
        }
        const withdrawQuery = signQuery(withdrawParams);
        const withdrawal = yield axios_1.default.post(`${BASE_URL}/sapi/v1/capital/withdraw/apply?${withdrawQuery}`, {}, {
            headers: { "X-MBX-APIKEY": API_KEY },
        });
        res.json({
            message: "Swap and withdrawal completed successfully",
            swapDetails: convert.data,
            withdrawalId: withdrawal.data.id
        });
    }
    catch (err) {
        res.status(500).json({ error: ((_a = err.response) === null || _a === void 0 ? void 0 : _a.data) || err.message });
    }
}));
exports.default = router;
