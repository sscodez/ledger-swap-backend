import { Request, Response, RequestHandler } from 'express';
import Address from '../models/Address';
import { AuthRequest } from '../middleware/authMiddleware';

export const createAddress: RequestHandler = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { coin, network, label, address } = req.body;

  try {
    const newAddress = await Address.create({
      user: authReq.user!._id,
      coin,
      network,
      label,
      address,
    });

    res.status(201).json(newAddress);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred' });
    }
  }
};

export const getAddresses: RequestHandler = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const addresses = await Address.find({ user: authReq.user!._id });
    res.json(addresses);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred' });
    }
  }
};

export const deleteAddress: RequestHandler = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const address = await Address.findById(req.params.id);

    if (address) {
      if (address.user.toString() !== String(authReq.user!._id)) {
        return res.status(401).json({ message: 'Not authorized' });
      }
      await address.deleteOne();
      res.json({ message: 'Address removed' });
    } else {
      res.status(404).json({ message: 'Address not found' });
    }
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred' });
    }
  }
};

export const updateAddress: RequestHandler = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const { coin, network, label, address } = req.body;

  try {
    const existingAddress = await Address.findById(req.params.id);

    if (!existingAddress) {
      return res.status(404).json({ message: 'Address not found' });
    }

    if (existingAddress.user.toString() !== String(authReq.user!._id)) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    existingAddress.coin = coin ?? existingAddress.coin;
    existingAddress.network = network ?? existingAddress.network;
    existingAddress.label = label ?? existingAddress.label;
    existingAddress.address = address ?? existingAddress.address;

    const updated = await existingAddress.save();
    res.json(updated);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred' });
    }
  }
};
