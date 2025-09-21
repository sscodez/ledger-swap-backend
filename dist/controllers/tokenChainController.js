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
exports.setTokenEnabled = exports.listTokens = exports.setChainEnabled = exports.createToken = exports.createChain = exports.listChains = void 0;
const Chain_1 = __importDefault(require("../models/Chain"));
const Token_1 = __importDefault(require("../models/Token"));
// Chains
const listChains = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const items = yield Chain_1.default.find({}).sort({ name: 1 });
        res.json(items);
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to list chains', error: err.message });
    }
});
exports.listChains = listChains;
const createChain = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { key, name, enabled } = req.body;
        if (!key || !name) {
            return res.status(400).json({ message: 'key and name are required' });
        }
        const normKey = key.toLowerCase().trim();
        const exists = yield Chain_1.default.findOne({ key: normKey });
        if (exists) {
            return res.status(409).json({ message: 'Chain already exists' });
        }
        const chain = yield Chain_1.default.create({ key: normKey, name: name.trim(), enabled: enabled !== undefined ? !!enabled : true });
        res.status(201).json(chain);
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to create chain', error: err.message });
    }
});
exports.createChain = createChain;
const createToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { symbol, name, chainKey, enabled } = req.body;
        if (!symbol || !name || !chainKey) {
            return res.status(400).json({ message: 'symbol, name and chainKey are required' });
        }
        // ensure chain exists
        const chain = yield Chain_1.default.findOne({ key: chainKey });
        if (!chain) {
            return res.status(404).json({ message: 'Chain not found' });
        }
        const key = `${symbol.toLowerCase()}-${chainKey.toLowerCase()}`;
        const existing = yield Token_1.default.findOne({ key });
        if (existing) {
            return res.status(409).json({ message: 'Token already exists for this chain' });
        }
        const token = yield Token_1.default.create({ key, symbol, name, chainKey, enabled: enabled !== undefined ? !!enabled : true });
        res.status(201).json(token);
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to create token', error: err.message });
    }
});
exports.createToken = createToken;
const setChainEnabled = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { key } = req.params;
        const { enabled } = req.body;
        const chain = yield Chain_1.default.findOneAndUpdate({ key }, { enabled }, { new: true, upsert: false });
        if (!chain)
            return res.status(404).json({ message: 'Chain not found' });
        res.json(chain);
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to update chain', error: err.message });
    }
});
exports.setChainEnabled = setChainEnabled;
// Tokens
const listTokens = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { chainKey } = req.query;
        const query = {};
        if (chainKey)
            query.chainKey = chainKey;
        const items = yield Token_1.default.find(query).sort({ symbol: 1 });
        res.json(items);
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to list tokens', error: err.message });
    }
});
exports.listTokens = listTokens;
const setTokenEnabled = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { key } = req.params;
        const { enabled } = req.body;
        const token = yield Token_1.default.findOneAndUpdate({ key }, { enabled }, { new: true, upsert: false });
        if (!token)
            return res.status(404).json({ message: 'Token not found' });
        res.json(token);
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to update token', error: err.message });
    }
});
exports.setTokenEnabled = setTokenEnabled;
