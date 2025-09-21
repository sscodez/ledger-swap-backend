import jwt from 'jsonwebtoken';

const generateToken = (id: string) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not found in .env file');
  }
  return jwt.sign({ id }, secret, {
    expiresIn: '30d',
  });
};

export default generateToken;
