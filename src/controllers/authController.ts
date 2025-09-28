import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Overview from '../models/Overview';
import generateToken from '../utils/generateToken';

export const signup = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
    });

    if (user) {
      await Overview.create({ user: user._id });
      const token = generateToken(String(user._id));
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token,
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred' });
    }
  }
};

export const adminSignin = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    if (user.password && (await bcrypt.compare(password, user.password))) {
      const token = generateToken(String(user._id));
      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token,
        role: user.role,
      });
    }

    return res.status(401).json({ message: 'Invalid email or password' });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred' });
    }
  }
};

export const signin = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && user.password && (await bcrypt.compare(password, user.password))) {
      const token = generateToken(String(user._id));
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token,
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred' });
    }
  }
};

export const googleCallback = (req: Request, res: Response) => {
  const user = req.user as any;
  const token = generateToken(user._id.toString());
  // Redirect to frontend with token
  res.redirect(`https://ledgerswap.io/?token=${token}`);
};

export const facebookCallback = (req: Request, res: Response) => {
  const user = req.user as any;
  const token = generateToken(user._id.toString());
  // Redirect to frontend with token
  res.redirect(`${process.env.FRONTEND_URL}/?token=${token}`);
};
