import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';

interface DecodedToken {
  id: string;
}

export interface AuthRequest extends Request {
  user?: IUser;
}

export const protect: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
      const authReq = req as AuthRequest;
      authReq.user = await User.findById(decoded.id).select('-password') as IUser;
      if (!authReq.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }
      next();
    } catch (error) { 
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const optionalAuth: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
      const authReq = req as AuthRequest;
      authReq.user = await User.findById(decoded.id).select('-password') as IUser;
      // If user not found, continue without user (anonymous)
      if (!authReq.user) {
        console.log('Token provided but user not found, continuing as anonymous');
      }
    } catch (error) {
      console.log('Token verification failed, continuing as anonymous:', error);
      // Continue without user (anonymous access)
    }
  }

  // Always continue, whether authenticated or anonymous
  next();
};

export const isAdmin: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;
  if (authReq.user && authReq.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Admin access required' });
};
