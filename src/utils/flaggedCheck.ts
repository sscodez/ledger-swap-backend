import Address from '../models/Address';
import User from '../models/User';

/**
 * Check if a wallet address is flagged
 * @param walletAddress - The wallet address to check
 * @returns Promise<{isFlagged: boolean, reason?: string, flaggedAt?: Date}>
 */
export const checkFlaggedAddress = async (walletAddress: string) => {
  try {
    const flaggedAddress = await Address.findOne({ 
      address: walletAddress.trim(),
      flagged: true 
    });

    if (flaggedAddress) {
      return {
        isFlagged: true,
        reason: flaggedAddress.flaggedReason,
        flaggedAt: flaggedAddress.flaggedAt,
        type: 'address'
      };
    }

    return { isFlagged: false };
  } catch (error) {
    console.error('Error checking flagged address:', error);
    // In case of error, assume not flagged to avoid blocking legitimate users
    return { isFlagged: false };
  }
};

/**
 * Check if a user is flagged by their ID
 * @param userId - The user ID to check
 * @returns Promise<{isFlagged: boolean, reason?: string, flaggedAt?: Date}>
 */
export const checkFlaggedUser = async (userId: string) => {
  try {
    const user = await User.findById(userId);

    if (user && user.flagged) {
      return {
        isFlagged: true,
        reason: user.flaggedReason,
        flaggedAt: user.flaggedAt,
        type: 'user'
      };
    }

    return { isFlagged: false };
  } catch (error) {
    console.error('Error checking flagged user:', error);
    // In case of error, assume not flagged to avoid blocking legitimate users
    return { isFlagged: false };
  }
};

/**
 * Check if a user owns any flagged addresses
 * @param userId - The user ID to check
 * @returns Promise<{isFlagged: boolean, reason?: string, flaggedAt?: Date, addresses?: string[]}>
 */
export const checkUserFlaggedAddresses = async (userId: string) => {
  try {
    const flaggedAddresses = await Address.find({ 
      user: userId,
      flagged: true 
    });

    if (flaggedAddresses.length > 0) {
      return {
        isFlagged: true,
        reason: `User has ${flaggedAddresses.length} flagged address(es)`,
        flaggedAt: flaggedAddresses[0].flaggedAt,
        addresses: flaggedAddresses.map(addr => addr.address),
        type: 'user_addresses'
      };
    }

    return { isFlagged: false };
  } catch (error) {
    console.error('Error checking user flagged addresses:', error);
    return { isFlagged: false };
  }
};

/**
 * Comprehensive check for flagged status (user, address, and user's addresses)
 * @param userId - The user ID
 * @param walletAddress - The wallet address (optional)
 * @returns Promise<{isFlagged: boolean, reason?: string, flaggedAt?: Date, type?: string}>
 */
export const checkComprehensiveFlagged = async (userId: string, walletAddress?: string) => {
  try {
    // Check if user is flagged
    const userCheck = await checkFlaggedUser(userId);
    if (userCheck.isFlagged) {
      return userCheck;
    }

    // Check if user has any flagged addresses
    const userAddressCheck = await checkUserFlaggedAddresses(userId);
    if (userAddressCheck.isFlagged) {
      return userAddressCheck;
    }

    // Check if the specific wallet address is flagged (if provided)
    if (walletAddress) {
      const addressCheck = await checkFlaggedAddress(walletAddress);
      if (addressCheck.isFlagged) {
        return addressCheck;
      }
    }

    return { isFlagged: false };
  } catch (error) {
    console.error('Error in comprehensive flagged check:', error);
    return { isFlagged: false };
  }
};
