const configuredOrigin = process.env.APP_ORIGIN || 'http://localhost:5173';
const developmentOrigins =
  process.env.NODE_ENV === 'production'
    ? []
    : [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5174',
      ];

export const allowedOrigins = new Set([configuredOrigin, ...developmentOrigins]);
export const isAllowedOrigin = (origin: string | undefined) =>
  Boolean(origin && allowedOrigins.has(origin));
export const corsOrigin = (
  origin: string | undefined,
  callback: (error: Error | null, allowed?: boolean) => void,
) => callback(null, !origin || isAllowedOrigin(origin));
