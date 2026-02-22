import { Request, Response, NextFunction } from 'express';
import { auth } from '../lib/auth.js';
import { fromNodeHeaders } from 'better-auth/node';

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (process.env.VITE_AUTH_BYPASS === 'true') {
    req.user = {
      id: 'dev-admin-000',
      name: 'Dev Admin',
      email: 'admin@localhost',
      image: null,
    };
    next();
    return;
  }

  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if ((session.user as { role?: string }).role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
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
