import { Request, Response, NextFunction } from 'express';
import { auth } from '../lib/auth.js';
import { fromNodeHeaders } from 'better-auth/node';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        email: string;
        image?: string | null;
      };
    }
  }
}

const DEV_USER = {
  id: 'dev-user-000',
  name: 'Dev User',
  email: 'dev@localhost',
  image: null,
};

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (process.env.VITE_AUTH_BYPASS === 'true') {
    req.user = DEV_USER;
    next();
    return;
  }

  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    req.user = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
    };

    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}
