import crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits

/**
 * Get encryption key from environment variable
 */
function getEncryptionKey(): Buffer {
  const key = process.env.PRIVATE_KEY_ENCRYPTION_SECRET;
  if (!key) {
    throw new Error('PRIVATE_KEY_ENCRYPTION_SECRET environment variable is required');
  }
  
  // Create a consistent 32-byte key from the secret
  return crypto.scryptSync(key, 'salt', KEY_LENGTH);
}

/**
 * Encrypt a private key
 */
export function encryptPrivateKey(privateKey: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    cipher.setAAD(Buffer.from('privatekey', 'utf8'));
    
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combine iv + tag + encrypted data
    const result = iv.toString('hex') + tag.toString('hex') + encrypted;
    return result;
  } catch (error) {
    console.error('❌ Error encrypting private key:', error);
    throw new Error('Failed to encrypt private key');
  }
}

/**
 * Decrypt a private key
 */
export function decryptPrivateKey(encryptedData: string): string {
  try {
    const key = getEncryptionKey();
    
    // Extract iv, tag, and encrypted data
    const iv = Buffer.from(encryptedData.slice(0, IV_LENGTH * 2), 'hex');
    const tag = Buffer.from(encryptedData.slice(IV_LENGTH * 2, (IV_LENGTH + TAG_LENGTH) * 2), 'hex');
    const encrypted = encryptedData.slice((IV_LENGTH + TAG_LENGTH) * 2);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAAD(Buffer.from('privatekey', 'utf8'));
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('❌ Error decrypting private key:', error);
    throw new Error('Failed to decrypt private key');
  }
}

/**
 * Validate private key format (basic validation)
 */
export function validatePrivateKey(privateKey: string): boolean {
  // Remove 0x prefix if present
  const cleanKey = privateKey.replace(/^0x/, '');
  
  // Check if it's a valid hex string of correct length (64 characters = 32 bytes)
  const hexRegex = /^[a-fA-F0-9]{64}$/;
  return hexRegex.test(cleanKey);
}

/**
 * Derive wallet address from private key (for Ethereum-based chains)
 */
export function deriveWalletAddress(privateKey: string): string {
  try {
    // This is a placeholder - you'll need to implement based on the specific blockchain
    // For Ethereum: use ethers.js to derive address from private key
    
    // Remove 0x prefix if present
    const cleanKey = privateKey.replace(/^0x/, '');
    
    // For now, return a placeholder - implement with ethers.js
    return `0x${crypto.createHash('sha256').update(cleanKey).digest('hex').slice(0, 40)}`;
  } catch (error) {
    console.error('❌ Error deriving wallet address:', error);
    throw new Error('Failed to derive wallet address');
  }
}

/**
 * Securely clear sensitive data from memory
 */
export function clearSensitiveData(data: string): void {
  // In Node.js, we can't truly clear memory, but we can overwrite the string
  // This is more of a symbolic security measure
  if (data) {
    // Overwrite with random data
    const length = data.length;
    for (let i = 0; i < length; i++) {
      data = data.substring(0, i) + '*' + data.substring(i + 1);
    }
  }
}
