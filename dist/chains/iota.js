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
exports.EthereumEscrow = void 0;
const ethers_1 = require("ethers");
// Simple escrow contract ABI for IOTA EVM
const EscrowABI = [
    "function release() external",
    "function refund() external"
];
const EscrowBytecode = "0x608060405234801561001057600080fd5b50";
// Lazy initialization to prevent crashes when env vars are missing
let provider = null;
let adminWallet = null;
function initializeProvider() {
    if (!provider && process.env.ETH_RPC && process.env.ADMIN_PK) {
        provider = new ethers_1.ethers.JsonRpcProvider(process.env.ETH_RPC);
        adminWallet = new ethers_1.ethers.Wallet(process.env.ADMIN_PK, provider);
    }
    return { provider, adminWallet };
}
exports.EthereumEscrow = {
    create(_a) {
        return __awaiter(this, arguments, void 0, function* ({ seller, buyer, amount }) {
            const { provider, adminWallet } = initializeProvider();
            if (!provider || !adminWallet) {
                throw new Error('IOTA escrow not configured - missing ETH_RPC or ADMIN_PK environment variables');
            }
            // For IOTA EVM, we'll use a simple contract deployment
            // In production, deploy actual escrow contract
            const factory = new ethers_1.ethers.ContractFactory(EscrowABI, EscrowBytecode, adminWallet);
            const contract = yield factory.deploy();
            yield contract.waitForDeployment();
            return yield contract.getAddress();
        });
    },
    release(_a) {
        return __awaiter(this, arguments, void 0, function* ({ contractAddr }) {
            const { adminWallet } = initializeProvider();
            if (!adminWallet) {
                throw new Error('IOTA escrow not configured - missing ADMIN_PK environment variable');
            }
            const contract = new ethers_1.ethers.Contract(contractAddr, EscrowABI, adminWallet);
            const tx = yield contract.release();
            return yield tx.wait();
        });
    },
    refund(_a) {
        return __awaiter(this, arguments, void 0, function* ({ contractAddr }) {
            const { adminWallet } = initializeProvider();
            if (!adminWallet) {
                throw new Error('IOTA escrow not configured - missing ADMIN_PK environment variable');
            }
            const contract = new ethers_1.ethers.Contract(contractAddr, EscrowABI, adminWallet);
            const tx = yield contract.refund();
            return yield tx.wait();
        });
    }
};
