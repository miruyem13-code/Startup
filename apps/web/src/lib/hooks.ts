import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, setCsrf, type Catalog, type Dashboard, type SessionData } from './api';
import { useUi } from './state';
export const useSession = () =>
  useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const data = await api<SessionData>('/session');
      setCsrf(data.csrf);
      return data;
    },
    staleTime: 60000,
  });
export const useCatalog = () =>
  useQuery({
    queryKey: ['catalog'],
    queryFn: () => api<Catalog>('/catalog'),
    staleTime: 30000,
    refetchInterval: 60000,
  });
export function useDashboard(days = 7) {
  const session = useSession();
  return useQuery({
    queryKey: ['dashboard', days, session.data?.user?.id],
    queryFn: () => api<Dashboard>(`/dashboard?days=${days}`),
    enabled: !!session.data?.user,
    refetchInterval: 30000,
  });
}
export function useAction<T = unknown>(path: string, success = 'Saved', method?: string) {
  const client = useQueryClient();
  const notify = useUi((s) => s.notify);
  return useMutation({
    mutationFn: (body: unknown = {}) => {
      let target = path;
      if (path.includes(':id')) {
        if (!body || typeof body !== 'object' || !('id' in body) || typeof body.id !== 'string')
          throw new Error('Choose a record before continuing.');
        target = path.replace(':id', encodeURIComponent(body.id));
      }
      return api<T>(target, body, method);
    },
    onMutate: async () => {
      if (path === '/auth/logout') await client.cancelQueries();
    },
    onSuccess: async () => {
      if (path === '/auth/logout') {
        setCsrf(null);
        client.clear();
        return;
      }
      await client.invalidateQueries();
      notify(success);
    },
    onError: (e: Error) => notify(e.message),
  });
}
