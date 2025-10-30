import { ethers } from "ethers";
import { EscrowAdapter } from "../types/escrowAdaptar";

// Simple escrow contract ABI for XDC
const EscrowABI = [
  "function release() external",
  "function refund() external"
];
const EscrowBytecode = "0x608060405234801561001057600080fd5b50";

const provider = new ethers.JsonRpcProvider(process.env.ETH_RPC);
const adminWallet = new ethers.Wallet(process.env.ADMIN_PK!, provider);

export const EthereumEscrow: EscrowAdapter = {
  async create({ seller, buyer, amount }) {
    // For XDC, we'll use a simple contract deployment
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
    const contract = new ethers.Contract(contractAddr, EscrowABI, adminWallet);
    const tx = await contract.release();
    return await tx.wait();
  },
  async refund({ contractAddr }) {
    const contract = new ethers.Contract(contractAddr, EscrowABI, adminWallet);
    const tx = await contract.refund();
    return await tx.wait();
  }
};
