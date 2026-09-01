import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

export const AUTH_COOKIE_NAME = 'gem_auth_token';

// Retrieve JWT secret from environment variables safely
const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is missing. Please set it in .env');
  }
  return new TextEncoder().encode(secret);
};

// Hash plain-text password using bcrypt (10 salt rounds)
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Compare plain-text password against stored bcrypt hash
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generate a signed JWT session token (expires in 7 days)
export async function signToken(payload: {
  userId: string;
  email: string;
  name: string;
  role: string;
  assignedEntity?: string | null;
}): Promise<string> {
  const secretKey = getJwtSecretKey();
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);
}

// Verify and decode a JWT session token
export async function verifyToken(token: string): Promise<{
  userId: string;
  email: string;
  name: string;
  role: string;
  assignedEntity?: string | null;
} | null> {
  try {
    const secretKey = getJwtSecretKey();
    const { payload } = await jwtVerify(token, secretKey);
    return payload as any;
  } catch (error) {
    return null;
  }
}
