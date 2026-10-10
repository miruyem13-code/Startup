import serverless from 'serverless-http';
import { app } from '../../apps/api/src/app';

// Reuse the existing, security-hardened Express API in Netlify's function runtime.
export const handler = serverless(app);
