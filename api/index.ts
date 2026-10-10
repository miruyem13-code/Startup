import type { IncomingMessage, ServerResponse } from 'node:http';
import { app } from '../apps/api/src/app.js';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '/', 'https://internal.invalid');
  const path = url.searchParams.get('__velocity_path');
  if (path !== null) {
    url.searchParams.delete('__velocity_path');
    const query = url.searchParams.toString();
    req.url = `/api/${path.split('/').map(encodeURIComponent).join('/')}${query ? `?${query}` : ''}`;
  }
  return app(req, res);
}
