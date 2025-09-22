import { Router } from 'express';
import axios from 'axios';
import crypto from 'crypto';

const router = Router();

const API_KEY = process.env.BINANCE_API_KEY!;
const API_SECRET = process.env.BINANCE_API_SECRET!;
const BASE_URL = "https://api.binance.com";

function signQuery(params: Record<string, any>) {
  const query = new URLSearchParams(params).toString();
  const signature = crypto.createHmac("sha256", API_SECRET).update(query).digest("hex");
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
router.get("/get-deposit/:coin", async (req, res) => {
  try {
    const coin = req.params.coin.toUpperCase();
    if (!SUPPORTED_COINS.includes(coin)) {
      return res.status(400).json({ error: "Coin not supported" });
    }

    const timestamp = Date.now();
    const query = signQuery({ coin, network: coin, timestamp });

    const result = await axios.get(`${BASE_URL}/sapi/v1/capital/deposit/address?${query}`, {
      headers: { "X-MBX-APIKEY": API_KEY },
    });

    res.json({ coin, depositAddress: result.data.address, tag: result.data.tag || null });
  } catch (err: any) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

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
router.get("/check-deposit/:coin", async (req, res) => {
  try {
    const coin = req.params.coin.toUpperCase();
    const timestamp = Date.now();
    const query = signQuery({ coin, timestamp });

    const result = await axios.get(`${BASE_URL}/sapi/v1/capital/deposit/hisrec?${query}`, {
      headers: { "X-MBX-APIKEY": API_KEY },
    });

    res.json({ deposits: result.data });
  } catch (err: any) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

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
router.post("/swap-to-xrp", async (req, res) => {
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

    const quote = await axios.post(`${BASE_URL}/sapi/v1/convert/getQuote?${query1}`, {}, {
      headers: { "X-MBX-APIKEY": API_KEY },
    });

    // Accept the quote
    const query2 = signQuery({
      quoteId: quote.data.quoteId,
      timestamp: Date.now(),
    });

    const convert = await axios.post(`${BASE_URL}/sapi/v1/convert/acceptQuote?${query2}`, {}, {
      headers: { "X-MBX-APIKEY": API_KEY },
    });

    res.json({ message: "Swap successful", details: convert.data });
  } catch (err: any) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

export default router;
