"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptPrivateKey = encryptPrivateKey;
exports.decryptPrivateKey = decryptPrivateKey;
exports.validatePrivateKey = validatePrivateKey;
exports.deriveWalletAddress = deriveWalletAddress;
exports.clearSensitiveData = clearSensitiveData;
const crypto_1 = __importDefault(require("crypto"));
// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits
/**
 * Get encryption key from environment variable
 */
function getEncryptionKey() {
    const key = process.env.PRIVATE_KEY_ENCRYPTION_SECRET;
    if (!key) {
        throw new Error('PRIVATE_KEY_ENCRYPTION_SECRET environment variable is required');
    }
    // Create a consistent 32-byte key from the secret
    return crypto_1.default.scryptSync(key, 'salt', KEY_LENGTH);
}
/**
 * Encrypt a private key
 */
function encryptPrivateKey(privateKey) {
    try {
        const key = getEncryptionKey();
        const iv = crypto_1.default.randomBytes(IV_LENGTH);
        const cipher = crypto_1.default.createCipheriv(ALGORITHM, key, iv);
        cipher.setAAD(Buffer.from('privatekey', 'utf8'));
        let encrypted = cipher.update(privateKey, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const tag = cipher.getAuthTag();
        // Combine iv + tag + encrypted data
        const result = iv.toString('hex') + tag.toString('hex') + encrypted;
        return result;
    }
    catch (error) {
        console.error('❌ Error encrypting private key:', error);
        throw new Error('Failed to encrypt private key');
    }
}
/**
 * Decrypt a private key
 */
function decryptPrivateKey(encryptedData) {
    try {
        const key = getEncryptionKey();
        // Extract iv, tag, and encrypted data
        const iv = Buffer.from(encryptedData.slice(0, IV_LENGTH * 2), 'hex');
        const tag = Buffer.from(encryptedData.slice(IV_LENGTH * 2, (IV_LENGTH + TAG_LENGTH) * 2), 'hex');
        const encrypted = encryptedData.slice((IV_LENGTH + TAG_LENGTH) * 2);
        const decipher = crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAAD(Buffer.from('privatekey', 'utf8'));
        decipher.setAuthTag(tag);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    catch (error) {
        console.error('❌ Error decrypting private key:', error);
        throw new Error('Failed to decrypt private key');
    }
}
/**
 * Validate private key format (basic validation)
 */
function validatePrivateKey(privateKey) {
    // Remove 0x prefix if present
    const cleanKey = privateKey.replace(/^0x/, '');
    // Check if it's a valid hex string of correct length (64 characters = 32 bytes)
    const hexRegex = /^[a-fA-F0-9]{64}$/;
    return hexRegex.test(cleanKey);
}
/**
 * Derive wallet address from private key (for Ethereum-based chains)
 */
function deriveWalletAddress(privateKey) {
    try {
        // This is a placeholder - you'll need to implement based on the specific blockchain
        // For Ethereum: use ethers.js to derive address from private key
        // Remove 0x prefix if present
        const cleanKey = privateKey.replace(/^0x/, '');
        // For now, return a placeholder - implement with ethers.js
        return `0x${crypto_1.default.createHash('sha256').update(cleanKey).digest('hex').slice(0, 40)}`;
    }
    catch (error) {
        console.error('❌ Error deriving wallet address:', error);
        throw new Error('Failed to derive wallet address');
    }
}
/**
 * Securely clear sensitive data from memory
 */
function clearSensitiveData(data) {
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
