import { validatePrivateKey } from './encryption';

/**
 * Supported cryptocurrencies for automated swaps
 */
export const SUPPORTED_CURRENCIES = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum', 
  XRP: 'XRP',
  XLM: 'Stellar',
  XDC: 'XDC Network',
  MIOTA: 'IOTA'
} as const;

export type SupportedCurrency = keyof typeof SUPPORTED_CURRENCIES;

/**
 * Private key configuration interface
 */
export interface PrivateKeyConfig {
  currency: SupportedCurrency;
  privateKey: string;
  walletAddress?: string;
  rpcEndpoint?: string;
  isValid: boolean;
}

/**
 * Get private key from environment variables
 */
export function getPrivateKey(currency: SupportedCurrency): string | null {
  const envKey = `${currency}_PRIVATE_KEY`;
  const privateKey = process.env[envKey];
  
  if (!privateKey || privateKey === 'your-' + currency.toLowerCase() + '-private-key-here') {
    console.warn(`⚠️ Private key not configured for ${currency}. Set ${envKey} in .env file`);
    return null;
  }
  
  return privateKey;
}

/**
 * Get wallet address from environment variables (auto-derived or manual)
 */
export function getWalletAddress(currency: SupportedCurrency): string | null {
  const envKey = `${currency}_WALLET_ADDRESS`;
  const address = process.env[envKey];
  
  if (!address || address === 'auto-derived-from-private-key') {
    // TODO: Implement auto-derivation from private key
    console.warn(`⚠️ Wallet address not configured for ${currency}. Set ${envKey} in .env file`);
    return null;
  }
  
  return address;
}

/**
 * Get RPC endpoint for blockchain
 */
export function getRpcEndpoint(currency: SupportedCurrency): string | null {
  let envKey: string;
  
  switch (currency) {
    case 'BTC':
      envKey = 'BITCOIN_RPC';
      break;
    case 'ETH':
      envKey = 'INFURA_ETHEREUM_RPC';
      break;
    case 'XRP':
      envKey = 'XRP_RPC';
      break;
    case 'XLM':
      envKey = 'STELLAR_RPC';
      break;
    case 'XDC':
      envKey = 'XDC_RPC';
      break;
    case 'MIOTA':
      envKey = 'IOTA_RPC';
      break;
    default:
      return null;
  }
  
  return process.env[envKey] || null;
}

/**
 * Validate private key configuration
 */
export function validatePrivateKeyConfig(currency: SupportedCurrency): PrivateKeyConfig {
  const privateKey = getPrivateKey(currency);
  const walletAddress = getWalletAddress(currency);
  const rpcEndpoint = getRpcEndpoint(currency);
  
  let isValid = false;
  
  if (privateKey) {
    // Basic validation - you might want to add currency-specific validation
    if (currency === 'ETH' || currency === 'XDC') {
      isValid = validatePrivateKey(privateKey);
    } else {
      // For other currencies, just check if it's not empty
      isValid = privateKey.length > 0;
    }
  }
  
  return {
    currency,
    privateKey: privateKey || '',
    walletAddress: walletAddress || undefined,
    rpcEndpoint: rpcEndpoint || undefined,
    isValid
  };
}

/**
 * Get all configured private keys
 */
export function getAllPrivateKeyConfigs(): PrivateKeyConfig[] {
  const currencies = Object.keys(SUPPORTED_CURRENCIES) as SupportedCurrency[];
  return currencies.map(currency => validatePrivateKeyConfig(currency));
}

/**
 * Check if automated swaps are properly configured
 */
export function isAutomatedSwapsConfigured(): boolean {
  const configs = getAllPrivateKeyConfigs();
  const validConfigs = configs.filter(config => config.isValid);
  
  console.log(`🔍 Automated Swap Configuration Check:`);
  console.log(`📊 Total currencies: ${configs.length}`);
  console.log(`✅ Valid configurations: ${validConfigs.length}`);
  
  configs.forEach(config => {
    const status = config.isValid ? '✅' : '❌';
    console.log(`${status} ${config.currency}: ${config.isValid ? 'Configured' : 'Missing/Invalid'}`);
  });
  
  return validConfigs.length > 0;
}

/**
 * Get private key for specific currency with validation
 */
export function getValidatedPrivateKey(currency: SupportedCurrency): string | null {
  const config = validatePrivateKeyConfig(currency);
  
  if (!config.isValid) {
    console.error(`❌ Invalid private key configuration for ${currency}`);
    return null;
  }
  
  console.log(`✅ Valid private key found for ${currency}`);
  return config.privateKey;
}

/**
 * Check if encryption secret is configured
 */
export function isEncryptionConfigured(): boolean {
  const secret = process.env.PRIVATE_KEY_ENCRYPTION_SECRET;
  
  if (!secret || secret === 'your-super-secret-encryption-key-here-make-it-long-and-random') {
    console.error('❌ PRIVATE_KEY_ENCRYPTION_SECRET not configured in .env file');
    return false;
  }
  
  if (secret.length < 32) {
    console.error('❌ PRIVATE_KEY_ENCRYPTION_SECRET should be at least 32 characters long');
    return false;
  }
  
  console.log('✅ Private key encryption is properly configured');
  return true;
}

/**
 * Initialize private key management system
 */
export function initializePrivateKeyManager(): boolean {
  console.log('🔐 Initializing Private Key Manager...');
  
  // Check if automated swaps are enabled
  const enabled = process.env.ENABLE_AUTOMATED_SWAPS === 'true';
  if (!enabled) {
    console.log('ℹ️ Automated swaps disabled (ENABLE_AUTOMATED_SWAPS=false)');
    return false;
  }
  
  // Check encryption configuration
  if (!isEncryptionConfigured()) {
    return false;
  }
  
  // Check private key configurations
  const configured = isAutomatedSwapsConfigured();
  
  if (configured) {
    console.log('🚀 Private Key Manager initialized successfully!');
  } else {
    console.log('⚠️ Private Key Manager initialized but no valid keys found');
  }
  
  return configured;
}
