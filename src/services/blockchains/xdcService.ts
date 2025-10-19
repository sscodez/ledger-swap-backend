/**
 * XDC Network Service
 * Handles XDC (XinFin) blockchain operations
 * Following production-ready patterns for wallet generation, monitoring, and transactions
 */

import { ethers } from 'ethers';
import Web3 from 'web3';
import axios from 'axios';

export interface XDCTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  blockNumber: number;
  timestamp: number;
  status: boolean;
}

export interface XRC20Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  totalSupply: string;
}

class XDCService {
  private web3: Web3;
  private rpcEndpoints: string[];
  private currentEndpointIndex = 0;
  private explorerUrl: string;
  private provider: ethers.providers.JsonRpcProvider;

  constructor() {
    this.rpcEndpoints = [
      process.env.XDC_RPC_URL || 'https://rpc.xinfin.network',
      'https://erpc.xinfin.network',
      'https://rpc.xinfin.yodaplus.net'
    ];
    
    this.explorerUrl = 'https://explorer.xinfin.network';
    this.web3 = new Web3(this.getRpcEndpoint());
    this.provider = new ethers.providers.JsonRpcProvider(this.getRpcEndpoint());
  }

  /**
   * Get current RPC endpoint with failover
   */
  private getRpcEndpoint(): string {
    return this.rpcEndpoints[this.currentEndpointIndex];
  }

  /**
   * Switch to next RPC endpoint on failure
   */
  private switchToNextEndpoint(): void {
    this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.rpcEndpoints.length;
    this.web3 = new Web3(this.getRpcEndpoint());
    this.provider = new ethers.providers.JsonRpcProvider(this.getRpcEndpoint());
    console.log(`🔄 Switched to XDC RPC endpoint: ${this.getRpcEndpoint()}`);
  }

  /**
   * Convert XDC address to Ethereum format (xdc → 0x)
   */
  private xdcToEth(address: string): string {
    if (address.toLowerCase().startsWith('xdc')) {
      return '0x' + address.slice(3);
    }
    return address;
  }

  /**
   * Convert Ethereum address to XDC format (0x → xdc)
   */
  private ethToXdc(address: string): string {
    if (address.toLowerCase().startsWith('0x')) {
      return 'xdc' + address.slice(2);
    }
    return address;
  }

  /**
   * Generate new XDC address (production-ready)
   * Creates a random wallet and returns XDC-formatted address
   * IMPORTANT: Store privateKey securely (encrypted in DB or vault)
   */
  async generateAddress(): Promise<{ address: string; privateKey: string }> {
    // Generate a new random wallet using ethers.js
    const wallet = ethers.Wallet.createRandom();
    
    // Convert Ethereum-style address to XDC format (xdc prefix instead of 0x)
    const xdcAddress = this.ethToXdc(wallet.address);
    
    console.log(`✅ Generated new XDC address: ${xdcAddress}`);
    
    return {
      address: xdcAddress,
      privateKey: wallet.privateKey // MUST be stored encrypted
    };
  }

  /**
   * Get XDC balance
   */
  async getBalance(address: string): Promise<string> {
    try {
      const ethAddress = this.xdcToEth(address);
      const balanceWei = await this.web3.eth.getBalance(ethAddress);
      return this.web3.utils.fromWei(balanceWei, 'ether');
    } catch (error: any) {
      console.error(`❌ XDC getBalance error:`, error.message);
      this.switchToNextEndpoint();
      return '0';
    }
  }

  /**
   * Monitor address for deposits (production pattern)
   * Polls blockchain for new transactions to the deposit address
   * @param address - XDC address to monitor
   * @param callback - Function called when deposit detected
   * @param interval - Polling interval in milliseconds (default 15s)
   */
  async monitorAddress(
    address: string,
    callback: (tx: XDCTransaction) => void,
    interval: number = 15000
  ): Promise<NodeJS.Timeout> {
    const ethAddress = this.xdcToEth(address);
    let lastBlock = await this.web3.eth.getBlockNumber();
    
    console.log(`🔍 Started monitoring XDC address: ${address} from block ${lastBlock}`);
    
    const intervalId = setInterval(async () => {
      try {
        const currentBlock = await this.web3.eth.getBlockNumber();
        
        // Check for new blocks
        if (currentBlock > lastBlock) {
          console.log(`📦 Checking XDC blocks ${lastBlock + 1} to ${currentBlock}`);
          
          // Scan each new block for transactions
          for (let i = lastBlock + 1; i <= currentBlock; i++) {
            const block = await this.web3.eth.getBlock(i, true);
            
            if (block && block.transactions) {
              for (const tx of block.transactions as any[]) {
                // Check if transaction is TO our address AND has value
                if (tx.to && 
                    tx.to.toLowerCase() === ethAddress.toLowerCase() && 
                    tx.value && 
                    tx.value.toString() !== '0') {
                  
                  console.log(`💰 XDC deposit detected! TX: ${tx.hash}`);
                  
                  const transaction = await this.getTransaction(tx.hash);
                  if (transaction) {
                    callback(transaction);
                  }
                }
              }
            }
          }
          
          lastBlock = currentBlock;
        }
      } catch (error) {
        console.error('❌ Error monitoring XDC address:', error);
      }
    }, interval);
    
    return intervalId;
  }

  /**
   * Get transaction details
   */
  async getTransaction(hash: string): Promise<XDCTransaction | null> {
    try {
      const tx = await this.web3.eth.getTransaction(hash);
      
      if (!tx) {
        return null;
      }

      const receipt = await this.web3.eth.getTransactionReceipt(hash);
      const block = await this.web3.eth.getBlock(tx.blockNumber as number);

      return {
        hash: tx.hash,
        from: this.ethToXdc(tx.from),
        to: this.ethToXdc(tx.to || ''),
        value: this.web3.utils.fromWei(tx.value.toString(), 'ether'),
        gas: tx.gas.toString(),
        gasPrice: this.web3.utils.fromWei(tx.gasPrice.toString(), 'gwei'),
        blockNumber: tx.blockNumber as number,
        timestamp: Number(block.timestamp),
        status: receipt?.status || false
      };
    } catch (error: any) {
      console.error(`❌ XDC getTransaction error:`, error.message);
      return null;
    }
  }

  /**
   * Send XDC transaction (production pattern)
   * Signs and broadcasts transaction to send XDC to recipient
   * @param privateKey - Sender's private key (from secure storage)
   * @param toAddress - Recipient XDC address
   * @param amount - Amount in XDC (as string)
   * @returns Transaction hash
   */
  async sendTransaction(
    privateKey: string,
    toAddress: string,
    amount: string
  ): Promise<string> {
    // Create wallet from private key
    const wallet = new ethers.Wallet(privateKey, this.provider);
    const ethToAddress = this.xdcToEth(toAddress);
    
    console.log(`📤 Sending ${amount} XDC to ${toAddress}...`);
    
    // Send transaction
    const tx = await wallet.sendTransaction({
      to: ethToAddress,
      value: ethers.utils.parseEther(amount)
    });
    
    console.log(`✅ XDC transaction sent! Hash: ${tx.hash}`);
    console.log(`⏳ Waiting for confirmation...`);
    
    // Wait for transaction to be mined
    await tx.wait();
    
    console.log(`✅ XDC transaction confirmed in block`);
    
    return tx.hash;
  }

  /**
   * Validate XDC address
   */
  validateAddress(address: string): boolean {
    // XDC addresses start with 'xdc' or '0x' and are 42 characters
    const xdcPattern = /^xdc[a-fA-F0-9]{40}$/;
    const ethPattern = /^0x[a-fA-F0-9]{40}$/;
    
    return xdcPattern.test(address) || ethPattern.test(address);
  }

  /**
   * Get current gas price
   */
  async getGasPrice(): Promise<string> {
    try {
      const gasPrice = await this.web3.eth.getGasPrice();
      return this.web3.utils.fromWei(gasPrice.toString(), 'gwei');
    } catch (error: any) {
      console.error(`❌ XDC getGasPrice error:`, error.message);
      return '1'; // Default 1 gwei
    }
  }

  /**
   * Send signed transaction
   */
  async sendSignedTransaction(signedTx: string): Promise<string> {
    try {
      const receipt = await this.web3.eth.sendSignedTransaction(signedTx);
      console.log(`✅ XDC transaction sent: ${receipt.transactionHash}`);
      return receipt.transactionHash;
    } catch (error: any) {
      console.error(`❌ XDC sendSignedTransaction error:`, error.message);
      throw new Error(`Failed to send XDC transaction: ${error.message}`);
    }
  }

  /**
   * Get network info
   */
  async getNetworkInfo(): Promise<{
    blockNumber: number;
    chainId: number;
    gasPrice: string;
  }> {
    try {
      const [blockNumber, chainId, gasPrice] = await Promise.all([
        this.web3.eth.getBlockNumber(),
        this.web3.eth.getChainId(),
        this.getGasPrice()
      ]);

      return {
        blockNumber: Number(blockNumber),
        chainId: Number(chainId),
        gasPrice
      };
    } catch (error: any) {
      console.error(`❌ XDC getNetworkInfo error:`, error.message);
      throw error;
    }
  }

  /**
   * Get account nonce
   */
  async getNonce(address: string): Promise<number> {
    try {
      const ethAddress = this.xdcToEth(address);
      const nonce = await this.web3.eth.getTransactionCount(ethAddress);
      return nonce;
    } catch (error: any) {
      console.error(`❌ XDC getNonce error:`, error.message);
      return 0;
    }
  }
}

export const xdcService = new XDCService();
export default xdcService;
