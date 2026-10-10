function httpsOrigin(value: string | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`);
    if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash) return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

const configuredOrigin =
  process.env.NODE_ENV === 'production'
    ? httpsOrigin(process.env.APP_ORIGIN) ||
      httpsOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
      httpsOrigin(process.env.VERCEL_URL)
    : process.env.APP_ORIGIN || 'http://localhost:5173';
const developmentOrigins =
  process.env.NODE_ENV === 'production'
    ? []
    : [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5174',
      ];

// Vercel assigns a unique deployment hostname. Trust only these platform-provided exact hosts;
// never use wildcard matching, and keep APP_ORIGIN as the canonical custom-domain origin.
const vercelOrigins =
  process.env.NODE_ENV === 'production'
    ? [
        httpsOrigin(process.env.VERCEL_URL),
        httpsOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL),
      ].filter((origin): origin is string => Boolean(origin))
    : [];

export const productionOrigin = configuredOrigin;
export const allowedOrigins = new Set([configuredOrigin, ...vercelOrigins, ...developmentOrigins]);
export const isAllowedOrigin = (origin: string | undefined) =>
  Boolean(origin && allowedOrigins.has(origin));
export const corsOrigin = (
  origin: string | undefined,
  callback: (error: Error | null, allowed?: boolean) => void,
) => callback(null, !origin || isAllowedOrigin(origin));
