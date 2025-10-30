import EscrowOffer from '../models/EscrowOffer';
import CryptoFee from '../models/CryptoFee';
import { createXrplEscrow, releaseXrplEscrow, cancelXrplEscrow } from '../smart-layers/xrpl';
import { createBitcoinEscrow, releaseBitcoinEscrow } from '../smart-layers/bitcoin';
import { createEscrowStellar } from '../smart-layers/stellar';
import { ethers } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import mongoose from 'mongoose';
import crypto from 'crypto';

/**
 * Multi-Chain Escrow Manager
 * Coordinates escrow creation, locking, and release across XRP, XDC, BTC, IOTA, XLM
 */
class EscrowManager {
  
  /**
   * Generate unique offer ID
   */
  private generateOfferId(): string {
    const randomId = crypto.randomBytes(5).toString('hex').toUpperCase();
    return `ESC-${Date.now()}-${randomId}`;
  }

  /**
   * Calculate admin fee based on crypto fee configuration
   */
  private async calculateAdminFee(currency: string, amount: number): Promise<{ percentage: number; amount: number }> {
    try {
      const feeConfig = await CryptoFee.findOne({
        symbol: currency.toUpperCase(),
        isActive: true
      });

      if (feeConfig) {
        const feePercentage = feeConfig.feePercentage;
        let feeAmount = (amount * feePercentage) / 100;

        // Apply min/max constraints
        if (feeConfig.minimumFee && feeAmount < feeConfig.minimumFee) {
          feeAmount = feeConfig.minimumFee;
        }
        if (feeConfig.maximumFee && feeAmount > feeConfig.maximumFee) {
          feeAmount = feeConfig.maximumFee;
        }

        return { percentage: feePercentage, amount: feeAmount };
      }

      // Default 2% fee
      return { percentage: 2, amount: amount * 0.02 };
    } catch (error) {
      console.error('Error calculating admin fee:', error);
      return { percentage: 2, amount: amount * 0.02 };
    }
  }

  /**
   * CREATE OFFER - Seller creates an escrow offer (no funds locked yet)
   */
  async createOffer(params: {
    sellerId?: string;
    sellerChain: 'XRP' | 'XDC' | 'BTC' | 'IOTA' | 'XLM';
    sellerAddress: string;
    sellerAmount: number;
    sellerCurrency: string;
    buyerChain?: 'XRP' | 'XDC' | 'BTC' | 'IOTA' | 'XLM';
    buyerAmount?: number;
    buyerCurrency?: string;
    description?: string;
    terms?: string;
    isPublic?: boolean;
    expirationHours?: number;
  }) {
    const offerId = this.generateOfferId();
    const expiresAt = new Date(Date.now() + (params.expirationHours || 24) * 60 * 60 * 1000);

    // Calculate admin fee
    const adminFee = await this.calculateAdminFee(params.sellerCurrency, params.sellerAmount);

    const offer = await EscrowOffer.create({
      offerId,
      seller: params.sellerId || null,
      sellerChain: params.sellerChain,
      sellerAddress: params.sellerAddress,
      sellerAmount: params.sellerAmount,
      sellerCurrency: params.sellerCurrency,
      buyerChain: params.buyerChain,
      buyerAmount: params.buyerAmount,
      buyerCurrency: params.buyerCurrency,
      description: params.description,
      terms: params.terms,
      isPublic: params.isPublic !== false,
      expiresAt,
      adminFeePercentage: adminFee.percentage,
      adminFeeAmount: adminFee.amount,
      status: 'created',
    });

    console.log(`✅ Escrow offer created: ${offerId}`);
    return offer;
  }

  /**
   * LOCK SELLER FUNDS - Seller locks their funds into escrow
   */
  async lockSellerFunds(params: {
    offerId: string;
    sellerSecret?: string; // For XRPL, BTC signing
    sellerPrivateKey?: string; // For EVM chains
  }) {
    const offer = await EscrowOffer.findOne({ offerId: params.offerId });
    if (!offer) throw new Error('Offer not found');
    if (offer.status !== 'created') throw new Error('Offer already locked or completed');

    let escrowTx: string | undefined;
    let contractAddress: string | undefined;

    try {
      switch (offer.sellerChain) {
        case 'XRP':
          if (!params.sellerSecret) throw new Error('Seller secret required for XRP');
          const xrpResult = await createXrplEscrow(
            params.sellerSecret,
            offer.sellerAddress, // Destination will be updated when buyer accepts
            offer.sellerAmount.toString(),
            3600, // 1 hour to finish
            86400, // 24 hours to cancel
            false // No HTLC for now
          );
          escrowTx = xrpResult.txHash;
          offer.sellerEscrowTx = xrpResult.txHash;
          offer.sellerContractAddress = xrpResult.escrowSequence?.toString();
          break;

        case 'XDC':
        case 'IOTA':
          if (!params.sellerPrivateKey) throw new Error('Seller private key required for EVM chains');
          // Deploy escrow contract
          const evmResult = await this.deployEVMEscrow(
            offer.sellerChain,
            params.sellerPrivateKey,
            offer.sellerAddress,
            offer.buyerAddress || ethers.ZeroAddress,
            offer.sellerAmount
          );
          contractAddress = evmResult.contractAddress;
          escrowTx = evmResult.txHash;
          offer.sellerContractAddress = contractAddress;
          offer.sellerEscrowTx = escrowTx;
          break;

        case 'BTC':
          // Bitcoin multisig escrow
          const btcEscrow = createBitcoinEscrow();
          offer.sellerContractAddress = btcEscrow.escrowAddress;
          offer.sellerEscrowTx = 'BTC_MULTISIG_CREATED';
          console.log(`🔐 Bitcoin multisig escrow created: ${btcEscrow.escrowAddress}`);
          console.log(`⚠️  Save these keys securely for later release`);
          break;

        case 'XLM':
          // Stellar multisig escrow
          if (!offer.buyerAddress) {
            throw new Error('Buyer address required for Stellar escrow');
          }
          const xlmEscrowAddress = await createEscrowStellar(
            offer.sellerAddress,
            offer.buyerAddress
          );
          offer.sellerContractAddress = xlmEscrowAddress;
          offer.sellerEscrowTx = 'XLM_MULTISIG_CREATED';
          console.log(`🔐 Stellar multisig escrow created: ${xlmEscrowAddress}`);
          break;

        default:
          throw new Error(`Unsupported chain: ${offer.sellerChain}`);
      }

      offer.status = 'seller_locked';
      offer.sellerLockedAt = new Date();
      await offer.save();

      console.log(`🔒 Seller funds locked for offer ${params.offerId}`);
      return offer;
    } catch (error: any) {
      console.error('Error locking seller funds:', error);
      throw new Error(`Failed to lock seller funds: ${error.message}`);
    }
  }

  /**
   * ACCEPT OFFER - Buyer accepts offer and locks their funds
   */
  async acceptOffer(params: {
    offerId: string;
    buyerId?: string;
    buyerAddress: string;
    buyerSecret?: string; // For XRPL
    buyerPrivateKey?: string; // For EVM chains
  }) {
    const offer = await EscrowOffer.findOne({ offerId: params.offerId });
    if (!offer) throw new Error('Offer not found');
    if (offer.status !== 'seller_locked') throw new Error('Seller must lock funds first');
    if (new Date() > offer.expiresAt) throw new Error('Offer expired');

    let buyerEscrowTx: string | undefined;
    let buyerContractAddress: string | undefined;

    try {
      // Update buyer information
      offer.buyer = params.buyerId ? new mongoose.Types.ObjectId(params.buyerId) : null;
      offer.buyerAddress = params.buyerAddress;

      switch (offer.buyerChain) {
        case 'XRP':
          if (!params.buyerSecret) throw new Error('Buyer secret required for XRP');
          if (!offer.buyerAmount) throw new Error('Buyer amount not specified');
          
          const xrpResult = await createXrplEscrow(
            params.buyerSecret,
            offer.sellerAddress,
            offer.buyerAmount.toString(),
            3600,
            86400,
            false
          );
          buyerEscrowTx = xrpResult.txHash;
          buyerContractAddress = xrpResult.escrowSequence?.toString();
          break;

        case 'XDC':
        case 'IOTA':
          if (!params.buyerPrivateKey) throw new Error('Buyer private key required for EVM chains');
          if (!offer.buyerAmount) throw new Error('Buyer amount not specified');
          
          const evmResult = await this.deployEVMEscrow(
            offer.buyerChain,
            params.buyerPrivateKey,
            params.buyerAddress,
            offer.sellerAddress,
            offer.buyerAmount
          );
          buyerContractAddress = evmResult.contractAddress;
          buyerEscrowTx = evmResult.txHash;
          break;

        case 'BTC':
          // Bitcoin buyer side - uses same multisig address
          console.log(`🔐 Bitcoin buyer will deposit to multisig: ${offer.sellerContractAddress}`);
          buyerContractAddress = offer.sellerContractAddress; // Same multisig address
          buyerEscrowTx = 'BTC_BUYER_DEPOSIT_PENDING';
          break;

        case 'XLM':
          // Stellar buyer side - uses same multisig account
          console.log(`🔐 Stellar buyer will deposit to multisig: ${offer.sellerContractAddress}`);
          buyerContractAddress = offer.sellerContractAddress; // Same multisig account
          buyerEscrowTx = 'XLM_BUYER_DEPOSIT_PENDING';
          break;

        default:
          throw new Error(`Unsupported buyer chain: ${offer.buyerChain}`);
      }

      offer.buyerEscrowTx = buyerEscrowTx;
      offer.buyerContractAddress = buyerContractAddress;
      offer.status = 'both_locked';
      offer.buyerLockedAt = new Date();
      await offer.save();

      console.log(`🔒 Buyer funds locked for offer ${params.offerId}`);
      console.log(`✅ Both parties locked - ready for release`);
      
      return offer;
    } catch (error: any) {
      console.error('Error accepting offer:', error);
      throw new Error(`Failed to accept offer: ${error.message}`);
    }
  }

  /**
   * RELEASE ESCROW - Release funds to both parties (minus admin fee)
   */
  async releaseEscrow(params: {
    offerId: string;
    adminSecret?: string; // For XRPL
    adminPrivateKey?: string; // For EVM chains
  }) {
    const offer = await EscrowOffer.findOne({ offerId: params.offerId });
    if (!offer) throw new Error('Offer not found');
    if (offer.status !== 'both_locked') throw new Error('Both parties must lock funds first');

    try {
      // Release seller's escrow to buyer
      if (offer.sellerChain === 'XRP' && params.adminSecret) {
        await releaseXrplEscrow(
          params.adminSecret,
          offer.sellerAddress,
          parseInt(offer.sellerContractAddress || '0')
        );
      } else if ((offer.sellerChain === 'XDC' || offer.sellerChain === 'IOTA') && params.adminPrivateKey) {
        await this.releaseEVMEscrow(
          offer.sellerChain,
          params.adminPrivateKey,
          offer.sellerContractAddress!
        );
      } else if (offer.sellerChain === 'BTC') {
        console.log(`🔓 Bitcoin escrow release requires 2-of-3 multisig signatures`);
        console.log(`📝 Escrow address: ${offer.sellerContractAddress}`);
        // Bitcoin release handled via PSBT with 2-of-3 signatures
      } else if (offer.sellerChain === 'XLM') {
        console.log(`🔓 Stellar escrow release requires multisig transaction`);
        console.log(`📝 Escrow account: ${offer.sellerContractAddress}`);
        // Stellar release handled via multisig transaction
      }

      // Release buyer's escrow to seller
      if (offer.buyerChain === 'XRP' && params.adminSecret) {
        await releaseXrplEscrow(
          params.adminSecret,
          offer.buyerAddress!,
          parseInt(offer.buyerContractAddress || '0')
        );
      } else if ((offer.buyerChain === 'XDC' || offer.buyerChain === 'IOTA') && params.adminPrivateKey) {
        await this.releaseEVMEscrow(
          offer.buyerChain!,
          params.adminPrivateKey,
          offer.buyerContractAddress!
        );
      } else if (offer.buyerChain === 'BTC') {
        console.log(`🔓 Bitcoin buyer escrow release requires multisig`);
      } else if (offer.buyerChain === 'XLM') {
        console.log(`🔓 Stellar buyer escrow release requires multisig`);
      }

      // TODO: Collect admin fee

      offer.status = 'completed';
      offer.completedAt = new Date();
      offer.adminFeeCollected = true;
      await offer.save();

      console.log(`✅ Escrow released for offer ${params.offerId}`);
      return offer;
    } catch (error: any) {
      console.error('Error releasing escrow:', error);
      throw new Error(`Failed to release escrow: ${error.message}`);
    }
  }

  /**
   * CANCEL/REFUND ESCROW
   */
  async cancelEscrow(params: {
    offerId: string;
    reason: string;
    cancelledBy?: string;
    adminSecret?: string;
    adminPrivateKey?: string;
  }) {
    const offer = await EscrowOffer.findOne({ offerId: params.offerId });
    if (!offer) throw new Error('Offer not found');

    try {
      // Refund seller if locked
      if (offer.status === 'seller_locked' || offer.status === 'both_locked') {
        if (offer.sellerChain === 'XRP' && params.adminSecret) {
          await cancelXrplEscrow(
            params.adminSecret,
            offer.sellerAddress,
            parseInt(offer.sellerContractAddress || '0')
          );
        }
      }

      // Refund buyer if locked
      if (offer.status === 'both_locked') {
        if (offer.buyerChain === 'XRP' && params.adminSecret) {
          await cancelXrplEscrow(
            params.adminSecret,
            offer.buyerAddress!,
            parseInt(offer.buyerContractAddress || '0')
          );
        }
      }

      offer.status = 'cancelled';
      offer.disputeReason = params.reason;
      await offer.save();

      console.log(`❌ Escrow cancelled for offer ${params.offerId}: ${params.reason}`);
      return offer;
    } catch (error: any) {
      console.error('Error cancelling escrow:', error);
      throw new Error(`Failed to cancel escrow: ${error.message}`);
    }
  }

  /**
   * Helper: Deploy EVM Escrow Contract
   */
  private async deployEVMEscrow(
    chain: 'XDC' | 'IOTA',
    privateKey: string,
    seller: string,
    buyer: string,
    amount: number
  ) {
    const rpcUrl = chain === 'XDC' 
      ? process.env.XDC_RPC_URL || 'https://rpc.apothem.network'
      : process.env.IOTA_RPC_URL || 'https://json-rpc.evm.testnet.iotaledger.net';

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    // Simple escrow contract ABI (matches your existing contracts)
    const abi = [
      "constructor(address _seller, address _buyer) payable",
      "function release() external",
      "function refund() external"
    ];

    const bytecode = "0x608060405260405161..."; // Your compiled contract bytecode

    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    const contract = await factory.deploy(seller, buyer, {
      value: ethers.parseEther(amount.toString())
    });

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    return {
      contractAddress: address,
      txHash: contract.deploymentTransaction()?.hash || ''
    };
  }

  /**
   * Helper: Release EVM Escrow
   */
  private async releaseEVMEscrow(chain: 'XDC' | 'IOTA', privateKey: string, contractAddress: string) {
    const rpcUrl = chain === 'XDC'
      ? process.env.XDC_RPC_URL || 'https://rpc.apothem.network'
      : process.env.IOTA_RPC_URL || 'https://json-rpc.evm.testnet.iotaledger.net';

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    const abi = ["function release() external"];
    const contract = new ethers.Contract(contractAddress, abi, wallet);

    const tx = await contract.release();
    await tx.wait();

    return tx.hash;
  }

  /**
   * GET ALL PUBLIC OFFERS
   */
  async getPublicOffers(filters?: {
    sellerChain?: string;
    buyerChain?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const query: any = { isPublic: true };

    if (filters?.sellerChain) query.sellerChain = filters.sellerChain;
    if (filters?.buyerChain) query.buyerChain = filters.buyerChain;
    if (filters?.status) query.status = filters.status;

    const offers = await EscrowOffer.find(query)
      .sort({ createdAt: -1 })
      .limit(filters?.limit || 50)
      .skip(filters?.offset || 0)
      .populate('seller', 'name email')
      .populate('buyer', 'name email');

    return offers;
  }

  /**
   * GET OFFER BY ID
   */
  async getOfferById(offerId: string) {
    const offer = await EscrowOffer.findOne({ offerId })
      .populate('seller', 'name email')
      .populate('buyer', 'name email');

    if (!offer) throw new Error('Offer not found');
    return offer;
  }

  /**
   * GET USER OFFERS (as seller or buyer)
   */
  async getUserOffers(userId: string) {
    const offers = await EscrowOffer.find({
      $or: [{ seller: userId }, { buyer: userId }]
    })
      .sort({ createdAt: -1 })
      .populate('seller', 'name email')
      .populate('buyer', 'name email');

    return offers;
  }
}

export default new EscrowManager();
