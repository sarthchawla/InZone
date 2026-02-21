import type { VercelRequest, VercelResponse } from '@vercel/node';

let app: any;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!app) {
    const mod = await import('../apps/api/src/app.js');
    app = mod.app;
  }
  return app(req, res);
}
