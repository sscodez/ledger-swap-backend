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
const escrowService_1 = require("../services/escrowService");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.post("/escrow/create/:chain", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.json(yield escrowService_1.EscrowService.create(req.params.chain, req.body));
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
app.post("/escrow/release/:chain", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.json(yield escrowService_1.EscrowService.release(req.params.chain, req.body));
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
app.post("/escrow/refund/:chain", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.json(yield escrowService_1.EscrowService.refund(req.params.chain, req.body));
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
app.listen(3000, () => console.log("✅ Multi-Chain Escrow API Running"));
