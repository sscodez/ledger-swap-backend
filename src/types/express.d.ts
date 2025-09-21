import type { IUser } from '../models/User';

declare global {
  namespace Express {
    // Augment Express Request with our authenticated user
    interface Request {
      user?: IUser;
    }
  }
}

export {};
