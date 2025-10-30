import { Request, Response, RequestHandler } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import escrowManager from '../services/escrowManager';

/**
 * CREATE ESCROW OFFER
 * POST /api/escrow/offers
 */
export const createEscrowOffer: RequestHandler = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  
  try {
    const {
      sellerChain,
      sellerAddress,
      sellerAmount,
      sellerCurrency,
      buyerChain,
      buyerAmount,
      buyerCurrency,
      description,
      terms,
      isPublic,
      expirationHours
    } = req.body;

    if (!sellerChain || !sellerAddress || !sellerAmount || !sellerCurrency) {
      return res.status(400).json({
        message: 'Missing required fields: sellerChain, sellerAddress, sellerAmount, sellerCurrency'
      });
    }

    const offer = await escrowManager.createOffer({
      sellerId: authReq.user?._id.toString(),
      sellerChain,
      sellerAddress,
      sellerAmount: Number(sellerAmount),
      sellerCurrency,
      buyerChain,
      buyerAmount: buyerAmount ? Number(buyerAmount) : undefined,
      buyerCurrency,
      description,
      terms,
      isPublic: isPublic !== false,
      expirationHours: expirationHours || 24
    });

    return res.status(201).json({
      success: true,
      offer,
      message: 'Escrow offer created successfully'
    });
  } catch (error: any) {
    console.error('Error creating escrow offer:', error);
    return res.status(500).json({
      message: 'Failed to create escrow offer',
      error: error.message
    });
  }
};

/**
 * GET PUBLIC OFFERS
 * GET /api/escrow/offers
 */
export const getPublicOffers: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { sellerChain, buyerChain, status, limit, offset } = req.query;

    const offers = await escrowManager.getPublicOffers({
      sellerChain: sellerChain as string,
      buyerChain: buyerChain as string,
      status: status as string,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0
    });

    return res.json({
      success: true,
      count: offers.length,
      offers
    });
  } catch (error: any) {
    console.error('Error fetching offers:', error);
    return res.status(500).json({
      message: 'Failed to fetch offers',
      error: error.message
    });
  }
};

/**
 * GET OFFER BY ID
 * GET /api/escrow/offers/:offerId
 */
export const getOfferById: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { offerId } = req.params;
    const offer = await escrowManager.getOfferById(offerId);

    return res.json({
      success: true,
      offer
    });
  } catch (error: any) {
    console.error('Error fetching offer:', error);
    return res.status(404).json({
      message: 'Offer not found',
      error: error.message
    });
  }
};

/**
 * LOCK SELLER FUNDS
 * POST /api/escrow/offers/:offerId/lock-seller
 */
export const lockSellerFunds: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { offerId } = req.params;
    const { sellerSecret, sellerPrivateKey } = req.body;

    const offer = await escrowManager.lockSellerFunds({
      offerId,
      sellerSecret,
      sellerPrivateKey
    });

    return res.json({
      success: true,
      offer,
      message: 'Seller funds locked successfully'
    });
  } catch (error: any) {
    console.error('Error locking seller funds:', error);
    return res.status(500).json({
      message: 'Failed to lock seller funds',
      error: error.message
    });
  }
};

/**
 * ACCEPT OFFER (Buyer locks funds)
 * POST /api/escrow/offers/:offerId/accept
 */
export const acceptOffer: RequestHandler = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  
  try {
    const { offerId } = req.params;
    const { buyerAddress, buyerSecret, buyerPrivateKey } = req.body;

    if (!buyerAddress) {
      return res.status(400).json({ message: 'Buyer address is required' });
    }

    const offer = await escrowManager.acceptOffer({
      offerId,
      buyerId: authReq.user?._id.toString(),
      buyerAddress,
      buyerSecret,
      buyerPrivateKey
    });

    return res.json({
      success: true,
      offer,
      message: 'Offer accepted and buyer funds locked'
    });
  } catch (error: any) {
    console.error('Error accepting offer:', error);
    return res.status(500).json({
      message: 'Failed to accept offer',
      error: error.message
    });
  }
};

/**
 * RELEASE ESCROW (Admin/Authorized)
 * POST /api/escrow/offers/:offerId/release
 */
export const releaseEscrow: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { offerId } = req.params;
    const { adminSecret, adminPrivateKey } = req.body;

    const offer = await escrowManager.releaseEscrow({
      offerId,
      adminSecret,
      adminPrivateKey
    });

    return res.json({
      success: true,
      offer,
      message: 'Escrow released successfully'
    });
  } catch (error: any) {
    console.error('Error releasing escrow:', error);
    return res.status(500).json({
      message: 'Failed to release escrow',
      error: error.message
    });
  }
};

/**
 * CANCEL ESCROW
 * POST /api/escrow/offers/:offerId/cancel
 */
export const cancelEscrow: RequestHandler = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  
  try {
    const { offerId } = req.params;
    const { reason, adminSecret, adminPrivateKey } = req.body;

    if (!reason) {
      return res.status(400).json({ message: 'Cancellation reason is required' });
    }

    const offer = await escrowManager.cancelEscrow({
      offerId,
      reason,
      cancelledBy: authReq.user?._id.toString(),
      adminSecret,
      adminPrivateKey
    });

    return res.json({
      success: true,
      offer,
      message: 'Escrow cancelled successfully'
    });
  } catch (error: any) {
    console.error('Error cancelling escrow:', error);
    return res.status(500).json({
      message: 'Failed to cancel escrow',
      error: error.message
    });
  }
};

/**
 * GET USER OFFERS
 * GET /api/escrow/my-offers
 */
export const getUserOffers: RequestHandler = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  
  try {
    if (!authReq.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const offers = await escrowManager.getUserOffers(authReq.user._id.toString());

    return res.json({
      success: true,
      count: offers.length,
      offers
    });
  } catch (error: any) {
    console.error('Error fetching user offers:', error);
    return res.status(500).json({
      message: 'Failed to fetch user offers',
      error: error.message
    });
  }
};
