/**
 * Builds the list of allowed origins for CORS and Better Auth trustedOrigins.
 *
 * Vercel sets several URL env vars (all without protocol prefix):
 * - VERCEL_URL: per-commit deployment URL (e.g. inzone-3ids5g3dh-team.vercel.app)
 * - VERCEL_BRANCH_URL: branch alias URL (e.g. inzone-git-branch-team.vercel.app)
 * - VERCEL_PROJECT_PRODUCTION_URL: production domain (e.g. inzone.vercel.app)
 */
export const allowedOrigins: string[] = [
  process.env.CORS_ORIGIN,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : undefined,
  process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined,
  process.env.NODE_ENV !== 'production' ? 'http://localhost:5173' : undefined,
].filter((v): v is string => Boolean(v));
