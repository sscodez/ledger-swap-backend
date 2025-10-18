/**
 * IOTA (Shimmer/IOTA 2.0) Integration Service
 * Handles IOTA transactions and native tokens on the Tangle
 * Note: IOTA uses a DAG (Directed Acyclic Graph) instead of blockchain
 */

import axios from 'axios';

export interface IOTATransaction {
  messageId: string;
  from: string[];
  to: string;
  amount: string;
  timestamp: number;
  confirmed: boolean;
  milestone: number;
}

export interface IOTAAddress {
  address: string;
  balance: string;
  outputs: IOTAOutput[];
}

export interface IOTAOutput {
  outputId: string;
  amount: string;
  address: string;
  spent: boolean;
}

export interface IOTANativeToken {
  tokenId: string;
  amount: string;
  metadata?: {
    name?: string;
    symbol?: string;
    decimals?: number;
  };
}

class IOTAService {
  private nodeEndpoints: string[];
  private currentEndpointIndex = 0;
  private explorerUrl: string;

  constructor() {
    // IOTA 2.0 / Shimmer network endpoints
    this.nodeEndpoints = [
      process.env.IOTA_NODE_URL || 'https://api.shimmer.network',
      'https://chrysalis-nodes.iota.org',
      'https://api.testnet.shimmer.network'
    ];
    
    this.explorerUrl = 'https://explorer.shimmer.network';
  }

  /**
   * Get current node endpoint with failover
   */
  private getNodeEndpoint(): string {
    return this.nodeEndpoints[this.currentEndpointIndex];
  }

  /**
   * Switch to next node endpoint on failure
   */
  private switchToNextEndpoint(): void {
    this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.nodeEndpoints.length;
    console.log(`🔄 Switched to IOTA node endpoint: ${this.getNodeEndpoint()}`);
  }

  /**
   * Make API request to IOTA node
   */
  private async apiRequest(path: string, method: string = 'GET', data?: any): Promise<any> {
    try {
      const endpoint = this.getNodeEndpoint();
      
      const response = await axios({
        method,
        url: `${endpoint}${path}`,
        data,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error: any) {
      console.error(`❌ IOTA API error (${path}):`, error.message);
      this.switchToNextEndpoint();
      throw error;
    }
  }

  /**
   * Get IOTA address info
   */
  async getAddress(address: string): Promise<IOTAAddress | null> {
    try {
      const response = await this.apiRequest(`/api/core/v2/addresses/${address}`);
      
      return {
        address,
        balance: response.balance || '0',
        outputs: response.outputs?.map((output: any) => ({
          outputId: output.outputId,
          amount: output.amount,
          address: output.address,
          spent: output.isSpent || false
        })) || []
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log(`ℹ️ IOTA address not found: ${address}`);
        return null;
      }
      console.error(`❌ IOTA getAddress error:`, error.message);
      throw new Error(`Failed to get IOTA address: ${error.message}`);
    }
  }

  /**
   * Get IOTA balance (in MIOTA, 1 MIOTA = 1,000,000 base units)
   */
  async getBalance(address: string): Promise<string> {
    try {
      const addressInfo = await this.getAddress(address);
      
      if (!addressInfo) {
        return '0';
      }

      // Convert base units to MIOTA
      const balance = parseInt(addressInfo.balance) / 1000000;
      return balance.toString();
    } catch (error: any) {
      console.error(`❌ IOTA getBalance error:`, error.message);
      return '0';
    }
  }

  /**
   * Get native tokens held by address
   */
  async getNativeTokens(address: string): Promise<IOTANativeToken[]> {
    try {
      const addressInfo = await this.getAddress(address);
      
      if (!addressInfo) {
        return [];
      }

      const tokens: IOTANativeToken[] = [];
      
      // Extract native tokens from outputs
      for (const output of addressInfo.outputs) {
        // Check if output contains native tokens (IOTA 2.0 feature)
        // This would require additional API calls or output parsing
        // For now, return empty array as native tokens require more complex handling
      }
      
      return tokens;
    } catch (error: any) {
      console.error(`❌ IOTA getNativeTokens error:`, error.message);
      return [];
    }
  }

  /**
   * Get message/transaction details
   */
  async getMessage(messageId: string): Promise<IOTATransaction | null> {
    try {
      const response = await this.apiRequest(`/api/core/v2/messages/${messageId}`);
      
      const message = response.message;
      const payload = message.payload;

      // Extract transaction info from payload
      if (!payload || payload.type !== 0) { // Type 0 is transaction payload
        return null;
      }

      // Parse essence (transaction details)
      const essence = payload.essence;
      const inputs = essence.inputs || [];
      const outputs = essence.outputs || [];

      // Extract sender addresses from inputs
      const fromAddresses: string[] = [];
      for (const input of inputs) {
        // Would need to resolve input to address
        fromAddresses.push(''); // Placeholder
      }

      // Extract recipient and amount from outputs
      let toAddress = '';
      let amount = '0';
      
      if (outputs.length > 0) {
        toAddress = outputs[0].address;
        amount = (parseInt(outputs[0].amount) / 1000000).toString(); // Convert to MIOTA
      }

      return {
        messageId,
        from: fromAddresses,
        to: toAddress,
        amount,
        timestamp: message.timestamp || Date.now(),
        confirmed: response.metadata?.ledgerInclusionState === 'included',
        milestone: response.metadata?.referencedByMilestoneIndex || 0
      };
    } catch (error: any) {
      console.error(`❌ IOTA getMessage error:`, error.message);
      return null;
    }
  }

  /**
   * Monitor address for new messages
   */
  async monitorAddress(
    address: string,
    callback: (tx: IOTATransaction) => void,
    interval: number = 10000 // Check every 10 seconds
  ): Promise<NodeJS.Timeout> {
    console.log(`👁️ Monitoring IOTA address: ${address}`);
    
    let lastCheckedOutputs = new Set<string>();
    
    const intervalId = setInterval(async () => {
      try {
        const addressInfo = await this.getAddress(address);
        
        if (!addressInfo) {
          return;
        }

        // Check for new outputs
        for (const output of addressInfo.outputs) {
          if (!lastCheckedOutputs.has(output.outputId) && !output.spent) {
            console.log(`💰 New IOTA output detected: ${output.outputId}`);
            
            // Extract message ID from output ID
            const messageId = output.outputId.split(':')[0];
            
            const transaction = await this.getMessage(messageId);
            if (transaction) {
              callback(transaction);
            }
            
            lastCheckedOutputs.add(output.outputId);
          }
        }

        // Cleanup old outputs from tracking set
        if (lastCheckedOutputs.size > 1000) {
          lastCheckedOutputs = new Set(Array.from(lastCheckedOutputs).slice(-500));
        }
      } catch (error: any) {
        console.error(`❌ IOTA monitoring error:`, error.message);
      }
    }, interval);
    
    return intervalId;
  }

  /**
   * Validate IOTA address (Bech32 format)
   */
  validateAddress(address: string): boolean {
    // IOTA addresses use Bech32 format and start with 'iota' or 'smr' (Shimmer)
    // Mainnet: iota1... (63 chars)
    // Shimmer: smr1... (63 chars)
    const iotaPattern = /^iota1[a-z0-9]{59}$/;
    const shimmerPattern = /^smr1[a-z0-9]{59}$/;
    
    return iotaPattern.test(address) || shimmerPattern.test(address);
  }

  /**
   * Get node info
   */
  async getNodeInfo(): Promise<{
    name: string;
    version: string;
    isHealthy: boolean;
    latestMilestone: number;
    confirmedMilestone: number;
  }> {
    try {
      const response = await this.apiRequest('/api/core/v2/info');
      
      return {
        name: response.name || 'Unknown',
        version: response.version || '0.0.0',
        isHealthy: response.isHealthy || false,
        latestMilestone: response.status?.latestMilestone?.index || 0,
        confirmedMilestone: response.status?.confirmedMilestone?.index || 0
      };
    } catch (error: any) {
      console.error(`❌ IOTA getNodeInfo error:`, error.message);
      throw error;
    }
  }

  /**
   * Submit message to Tangle
   */
  async submitMessage(message: any): Promise<string> {
    try {
      const response = await this.apiRequest('/api/core/v2/messages', 'POST', message);
      
      console.log(`✅ IOTA message submitted: ${response.messageId}`);
      return response.messageId;
    } catch (error: any) {
      console.error(`❌ IOTA submitMessage error:`, error.message);
      throw new Error(`Failed to submit IOTA message: ${error.message}`);
    }
  }

  /**
   * Get tips (for PoW and message submission)
   */
  async getTips(): Promise<string[]> {
    try {
      const response = await this.apiRequest('/api/core/v2/tips');
      return response.tipMessageIds || [];
    } catch (error: any) {
      console.error(`❌ IOTA getTips error:`, error.message);
      return [];
    }
  }

  /**
   * Get minimum PoW score required
   */
  async getMinPoWScore(): Promise<number> {
    try {
      const nodeInfo = await this.getNodeInfo();
      // PoW score would be in node info response
      return 4000; // Default minimum PoW score
    } catch (error: any) {
      console.error(`❌ IOTA getMinPoWScore error:`, error.message);
      return 4000;
    }
  }

  /**
   * Check if message is confirmed
   */
  async isMessageConfirmed(messageId: string): Promise<boolean> {
    try {
      const response = await this.apiRequest(`/api/core/v2/messages/${messageId}/metadata`);
      return response.ledgerInclusionState === 'included';
    } catch (error: any) {
      console.error(`❌ IOTA isMessageConfirmed error:`, error.message);
      return false;
    }
  }

  /**
   * Get outputs by address
   */
  async getOutputsByAddress(address: string, includeSpent: boolean = false): Promise<IOTAOutput[]> {
    try {
      const addressInfo = await this.getAddress(address);
      
      if (!addressInfo) {
        return [];
      }

      if (!includeSpent) {
        return addressInfo.outputs.filter(output => !output.spent);
      }

      return addressInfo.outputs;
    } catch (error: any) {
      console.error(`❌ IOTA getOutputsByAddress error:`, error.message);
      return [];
    }
  }
}

export const iotaService = new IOTAService();
export default iotaService;
