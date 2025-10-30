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
// Simple escrow contract ABI for XDC
const EscrowABI = [
    "function release() external",
    "function refund() external"
];
const EscrowBytecode = "0x608060405234801561001057600080fd5b50";
const provider = new ethers_1.ethers.JsonRpcProvider(process.env.ETH_RPC);
const adminWallet = new ethers_1.ethers.Wallet(process.env.ADMIN_PK, provider);
exports.EthereumEscrow = {
    create(_a) {
        return __awaiter(this, arguments, void 0, function* ({ seller, buyer, amount }) {
            // For XDC, we'll use a simple contract deployment
            // In production, deploy actual escrow contract
            const factory = new ethers_1.ethers.ContractFactory(EscrowABI, EscrowBytecode, adminWallet);
            const contract = yield factory.deploy();
            yield contract.waitForDeployment();
            return yield contract.getAddress();
        });
    },
    release(_a) {
        return __awaiter(this, arguments, void 0, function* ({ contractAddr }) {
            const contract = new ethers_1.ethers.Contract(contractAddr, EscrowABI, adminWallet);
            const tx = yield contract.release();
            return yield tx.wait();
        });
    },
    refund(_a) {
        return __awaiter(this, arguments, void 0, function* ({ contractAddr }) {
            const contract = new ethers_1.ethers.Contract(contractAddr, EscrowABI, adminWallet);
            const tx = yield contract.refund();
            return yield tx.wait();
        });
    }
};
