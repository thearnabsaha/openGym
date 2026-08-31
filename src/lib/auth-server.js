import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export function getJwtSecret() {
  return (
    process.env.JWT_SECRET ||
    process.env.JWT_SECRET_KEY ||
    process.env.NEXTAUTH_SECRET ||
    'opengym_default_secret_key_2026'
  ).trim();
}

export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password, hash) {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}

export function signToken(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '90d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (e) {
    return null;
  }
}

export function getAuthUser(request) {
  let token = null;

  // 1. Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  // 2. Check HTTP-only cookie
  if (!token) {
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(/opengym_token=([^;]+)/);
      if (match) {
        token = match[1];
      }
    }
  }

  if (!token) return null;
  return verifyToken(token);
}
