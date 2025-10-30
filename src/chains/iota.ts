import { ethers } from "ethers";
import { EscrowAdapter } from "../types/escrowAdaptar";

// Simple escrow contract ABI for IOTA EVM
const EscrowABI = [
  "function release() external",
  "function refund() external"
];
const EscrowBytecode = "0x608060405234801561001057600080fd5b50";

// Lazy initialization to prevent crashes when env vars are missing
let provider: ethers.JsonRpcProvider | null = null;
let adminWallet: ethers.Wallet | null = null;

function initializeProvider() {
  if (!provider && process.env.ETH_RPC && process.env.ADMIN_PK) {
    provider = new ethers.JsonRpcProvider(process.env.ETH_RPC);
    adminWallet = new ethers.Wallet(process.env.ADMIN_PK, provider);
  }
  return { provider, adminWallet };
}

export const EthereumEscrow: EscrowAdapter = {
  async create({ seller, buyer, amount }) {
    const { provider, adminWallet } = initializeProvider();
    if (!provider || !adminWallet) {
      throw new Error('IOTA escrow not configured - missing ETH_RPC or ADMIN_PK environment variables');
    }
    
    // For IOTA EVM, we'll use a simple contract deployment
    // In production, deploy actual escrow contract
    const factory = new ethers.ContractFactory(
      EscrowABI,
      EscrowBytecode,
      adminWallet
    );
    const contract = await factory.deploy();
    await contract.waitForDeployment();
    return await contract.getAddress();
  },
  async release({ contractAddr }) {
    const { adminWallet } = initializeProvider();
    if (!adminWallet) {
      throw new Error('IOTA escrow not configured - missing ADMIN_PK environment variable');
    }
    
    const contract = new ethers.Contract(contractAddr, EscrowABI, adminWallet);
    const tx = await contract.release();
    return await tx.wait();
  },
  async refund({ contractAddr }) {
    const { adminWallet } = initializeProvider();
    if (!adminWallet) {
      throw new Error('IOTA escrow not configured - missing ADMIN_PK environment variable');
    }
    
    const contract = new ethers.Contract(contractAddr, EscrowABI, adminWallet);
    const tx = await contract.refund();
    return await tx.wait();
  }
};
