/**
 * XDC Network (XinFin) Integration Service
 * Handles XDC transactions and XRC20 tokens
 * XDC is EVM-compatible with some differences in address format
 */

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

  constructor() {
    this.rpcEndpoints = [
      process.env.XDC_RPC_URL || 'https://rpc.xinfin.network',
      'https://erpc.xinfin.network',
      'https://rpc.xinfin.yodaplus.net'
    ];
    
    this.explorerUrl = 'https://explorer.xinfin.network';
    this.web3 = new Web3(this.getRpcEndpoint());
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
   * Get XRC20 token balance
   */
  async getTokenBalance(tokenAddress: string, holderAddress: string): Promise<string> {
    try {
      const tokenEthAddress = this.xdcToEth(tokenAddress);
      const holderEthAddress = this.xdcToEth(holderAddress);

      // ERC20 balanceOf function ABI
      const minABI = [
        {
          constant: true,
          inputs: [{ name: '_owner', type: 'address' }],
          name: 'balanceOf',
          outputs: [{ name: 'balance', type: 'uint256' }],
          type: 'function'
        },
        {
          constant: true,
          inputs: [],
          name: 'decimals',
          outputs: [{ name: '', type: 'uint8' }],
          type: 'function'
        }
      ];

      const contract = new this.web3.eth.Contract(minABI as any, tokenEthAddress);
      const balance = await contract.methods.balanceOf(holderEthAddress).call();
      const decimals = await contract.methods.decimals().call();

      return this.web3.utils.fromWei(balance.toString(), 'ether');
    } catch (error: any) {
      console.error(`❌ XDC getTokenBalance error:`, error.message);
      return '0';
    }
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
   * Monitor address for new transactions
   */
  async monitorAddress(
    address: string,
    callback: (tx: XDCTransaction) => void,
    interval: number = 15000 // XDC block time ~2 seconds, check every 15s
  ): Promise<NodeJS.Timeout> {
    console.log(`👁️ Monitoring XDC address: ${address}`);
    
    const ethAddress = this.xdcToEth(address);
    let lastBlock = await this.web3.eth.getBlockNumber();
    
    const intervalId = setInterval(async () => {
      try {
        const currentBlock = await this.web3.eth.getBlockNumber();
        
        if (currentBlock > lastBlock) {
          // Check blocks for transactions to this address
          for (let i = lastBlock + 1; i <= currentBlock; i++) {
            const block = await this.web3.eth.getBlock(i, true);
            
            if (block && block.transactions) {
              for (const tx of block.transactions as any[]) {
                if (tx.to && tx.to.toLowerCase() === ethAddress.toLowerCase() && tx.value && tx.value.toString() !== '0') {
                  console.log(`💰 New XDC transaction detected: ${tx.hash}`);
                  
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
      } catch (error: any) {
        console.error(`❌ XDC monitoring error:`, error.message);
      }
    }, interval);
    
    return intervalId;
  }

  /**
   * Monitor XRC20 token transfers
   */
  async monitorTokenTransfers(
    tokenAddress: string,
    recipientAddress: string,
    callback: (transfer: any) => void,
    interval: number = 15000
  ): Promise<NodeJS.Timeout> {
    console.log(`👁️ Monitoring XRC20 token ${tokenAddress} for ${recipientAddress}`);
    
    const tokenEthAddress = this.xdcToEth(tokenAddress);
    const recipientEthAddress = this.xdcToEth(recipientAddress);
    
    // Transfer event signature
    const transferEventSignature = this.web3.utils.sha3('Transfer(address,address,uint256)');
    
    let lastBlock = await this.web3.eth.getBlockNumber();
    
    const intervalId = setInterval(async () => {
      try {
        const currentBlock = await this.web3.eth.getBlockNumber();
        
        if (currentBlock > lastBlock) {
          const logs = await this.web3.eth.getPastLogs({
            fromBlock: lastBlock + 1,
            toBlock: currentBlock,
            address: tokenEthAddress,
            topics: [
              transferEventSignature,
              null,
              this.web3.utils.padLeft(recipientEthAddress, 64)
            ]
          });
          
          for (const log of logs) {
            console.log(`💰 New XRC20 transfer detected`);
            callback(log);
          }
          
          lastBlock = currentBlock;
        }
      } catch (error: any) {
        console.error(`❌ XDC token monitoring error:`, error.message);
      }
    }, interval);
    
    return intervalId;
  }

  /**
   * Get XRC20 token info
   */
  async getTokenInfo(tokenAddress: string): Promise<XRC20Token | null> {
    try {
      const tokenEthAddress = this.xdcToEth(tokenAddress);

      const minABI = [
        {
          constant: true,
          inputs: [],
          name: 'name',
          outputs: [{ name: '', type: 'string' }],
          type: 'function'
        },
        {
          constant: true,
          inputs: [],
          name: 'symbol',
          outputs: [{ name: '', type: 'string' }],
          type: 'function'
        },
        {
          constant: true,
          inputs: [],
          name: 'decimals',
          outputs: [{ name: '', type: 'uint8' }],
          type: 'function'
        },
        {
          constant: true,
          inputs: [],
          name: 'totalSupply',
          outputs: [{ name: '', type: 'uint256' }],
          type: 'function'
        }
      ];

      const contract = new this.web3.eth.Contract(minABI as any, tokenEthAddress);

      const [name, symbol, decimals, totalSupply] = await Promise.all([
        contract.methods.name().call(),
        contract.methods.symbol().call(),
        contract.methods.decimals().call(),
        contract.methods.totalSupply().call()
      ]);

      return {
        address: this.ethToXdc(tokenEthAddress),
        name: name as string,
        symbol: symbol as string,
        decimals: Number(decimals),
        totalSupply: totalSupply.toString()
      };
    } catch (error: any) {
      console.error(`❌ XDC getTokenInfo error:`, error.message);
      return null;
    }
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
   * Estimate gas for transaction
   */
  async estimateGas(from: string, to: string, value: string): Promise<string> {
    try {
      const ethFrom = this.xdcToEth(from);
      const ethTo = this.xdcToEth(to);
      const valueWei = this.web3.utils.toWei(value, 'ether');

      const gasEstimate = await this.web3.eth.estimateGas({
        from: ethFrom,
        to: ethTo,
        value: valueWei
      });

      return gasEstimate.toString();
    } catch (error: any) {
      console.error(`❌ XDC estimateGas error:`, error.message);
      return '21000'; // Default gas limit for simple transfer
    }
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
