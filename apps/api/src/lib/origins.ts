/**
 * Builds the list of allowed origins for CORS and Better Auth trustedOrigins.
 *
 * - CORS_ORIGIN: explicit production origin (e.g. https://inzone.app)
 * - VERCEL_URL: auto-set by Vercel per deployment (preview + production)
 * - localhost: included in non-production environments for local dev
 */
export const allowedOrigins: string[] = [
  process.env.CORS_ORIGIN,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  process.env.NODE_ENV !== 'production' ? 'http://localhost:5173' : undefined,
].filter((v): v is string => Boolean(v));
