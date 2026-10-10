import type { catalog, dashboard, analytics } from '../../../api/src/domain/queries';
import type { Viewer } from '../../../../packages/shared/schemas';
export type Catalog = Awaited<ReturnType<typeof catalog>>;
export type Dashboard = Awaited<ReturnType<typeof dashboard>>;
export type Analytics = Awaited<ReturnType<typeof analytics>>;
export type SessionData = { user: Viewer | null; csrf: string | null; demo: boolean };
let csrf: string | null = null;
export function setCsrf(value: string | null) {
  csrf = value;
}
export async function api<T>(path: string, body?: unknown, method?: string): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: method || (body ? 'POST' : 'GET'),
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response
    .json()
    .catch(() => ({ message: 'The server returned an unexpected response.' }));
  if (!response.ok) throw new Error(result.message || 'Unable to complete this request.');
  return result as T;
}
export const money = (value: number) => new Intl.NumberFormat('en-US').format(value) + ' UZS';
export const number = (value: number, decimals = 0) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals }).format(value);
