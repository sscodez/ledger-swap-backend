import { Request, Response, RequestHandler } from 'express';
import User from '../models/User';
import { AuthRequest } from '../middleware/authMiddleware';

export const getUserProfile: RequestHandler = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  if (authReq.user) {
    res.json({
      _id: authReq.user._id,
      name: authReq.user.name,
      email: authReq.user.email,
      phone: authReq.user.phone,
      country: authReq.user.country,
      profilePicture: authReq.user.profilePicture,
      twoFactorEnabled: authReq.user.twoFactorEnabled,
    });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

export const updateUserProfile: RequestHandler = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const user = await User.findById(authReq.user!._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.phone = req.body.phone || user.phone;
    user.country = req.body.country || user.country;
    user.profilePicture = req.body.profilePicture || user.profilePicture;

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      country: updatedUser.country,
      profilePicture: updatedUser.profilePicture,
      twoFactorEnabled: updatedUser.twoFactorEnabled,
    });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};
