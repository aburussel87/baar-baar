import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export const generateToken = (id: string, email: string) => {
  return jwt.sign({ id, email }, env.JWT_SECRET, {
    expiresIn: '30d',
  });
};
