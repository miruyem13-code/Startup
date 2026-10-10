import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import './lib/i18n';
import './styles.css';
import App from './App';
import { useSession } from './lib/hooks';
import { useUi } from './lib/state';
const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});
function Runtime() {
  const { data } = useSession();
  const { theme, toast } = useUi();
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    if (!data?.user || !data.csrf) return;
    let socket: Socket | undefined;
    let disposed = false;
    void import('socket.io-client').then(({ io }) => {
      if (disposed) return;
      socket = io({ auth: { csrf: data.csrf }, withCredentials: true });
      socket.on('refresh', () => {
        client.invalidateQueries({ queryKey: ['catalog'] });
        client.invalidateQueries({ queryKey: ['dashboard'] });
        client.invalidateQueries({ queryKey: ['leaderboard'] });
        client.invalidateQueries({ queryKey: ['analytics'] });
        client.invalidateQueries({ queryKey: ['battles'] });
        client.invalidateQueries({ queryKey: ['seasons'] });
        client.invalidateQueries({ queryKey: ['invitations'] });
        client.invalidateQueries({ queryKey: ['admin-control'] });
      });
    });
    return () => {
      disposed = true;
      socket?.disconnect();
    };
  }, [data?.user?.id, data?.csrf]);
  return (
    <>
      <App />
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <Runtime />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
