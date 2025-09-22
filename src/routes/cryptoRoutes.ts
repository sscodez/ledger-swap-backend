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
router.post("/swap", async (req, res) => {
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
router.post("/withdraw", async (req, res) => {
  try {
    const { coin, amount, address, tag, network } = req.body;
    
    if (!SUPPORTED_COINS.includes(coin.toUpperCase())) {
      return res.status(400).json({ error: "Coin not supported" });
    }

    if (!address) {
      return res.status(400).json({ error: "Withdrawal address is required" });
    }

    const timestamp = Date.now();
    const withdrawParams: any = {
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

    const result = await axios.post(`${BASE_URL}/sapi/v1/capital/withdraw/apply?${query}`, {}, {
      headers: { "X-MBX-APIKEY": API_KEY },
    });

    res.json({ 
      message: "Withdrawal initiated successfully", 
      withdrawalId: result.data.id 
    });
  } catch (err: any) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

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
router.post("/swap-and-withdraw", async (req, res) => {
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

    const quote = await axios.post(`${BASE_URL}/sapi/v1/convert/getQuote?${query1}`, {}, {
      headers: { "X-MBX-APIKEY": API_KEY },
    });

    const query2 = signQuery({
      quoteId: quote.data.quoteId,
      timestamp: Date.now(),
    });

    const convert = await axios.post(`${BASE_URL}/sapi/v1/convert/acceptQuote?${query2}`, {}, {
      headers: { "X-MBX-APIKEY": API_KEY },
    });

    // Step 2: Withdraw the converted amount
    const timestamp2 = Date.now();
    const withdrawParams: any = {
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

    const withdrawal = await axios.post(`${BASE_URL}/sapi/v1/capital/withdraw/apply?${withdrawQuery}`, {}, {
      headers: { "X-MBX-APIKEY": API_KEY },
    });

    res.json({ 
      message: "Swap and withdrawal completed successfully",
      swapDetails: convert.data,
      withdrawalId: withdrawal.data.id
    });
  } catch (err: any) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

export default router;
