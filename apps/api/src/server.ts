import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { app, setBroadcast, setSocketRevoker } from './app';
import { db, transaction } from './db';
import { maintainCompetitions } from './domain/competition';
import { digest } from './security';
import { corsOrigin } from './origins';
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: corsOrigin, credentials: true },
});
io.use(async (socket, next) => {
  try {
    const raw = socket.handshake.headers.cookie
      ?.split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith('velocity_session='))
      ?.split('=')[1];
    if (!raw) return next(new Error('Authentication required'));
    const session = await db.session.findUnique({ where: { id: digest(raw) } });
    if (!session || session.expiresAt <= new Date()) return next(new Error('Session expired'));
    const user = await db.user.findUniqueOrThrow({ where: { id: session.userId } });
    if (user.status !== 'ACTIVE') return next(new Error('Account unavailable'));
    if (socket.handshake.auth.csrf !== session.csrf)
      return next(new Error('Session protection failed'));
    socket.data.userId = user.id;
    socket.data.expiresAt = session.expiresAt.getTime();
    next();
  } catch {
    next(new Error('Authentication failed'));
  }
});
io.on('connection', (socket) => {
  socket.join(`user:${socket.data.userId}`);
  const delay = socket.data.expiresAt - Date.now();
  const timer = setTimeout(() => socket.disconnect(true), delay);
  socket.on('disconnect', () => clearTimeout(timer));
});
setBroadcast(() => io.emit('refresh', { at: Date.now() }));
setSocketRevoker((userId) => io.in(`user:${userId}`).disconnectSockets(true));
const competitionTimer = setInterval(() => {
  transaction(maintainCompetitions).catch((error) =>
    console.error('Competition maintenance failed:', error.message),
  );
}, 60000);
competitionTimer.unref();
const port = Number(process.env.PORT) || 3001;
server.listen(
  port,
  process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1'),
  () =>
    console.log(
      `VELOCITY API http://localhost:${port} · ${process.env.NODE_ENV === 'production' ? 'production' : 'local demo'}`,
    ),
);
async function shutdown() {
  clearInterval(competitionTimer);
  io.close();
  server.close();
  await db.$disconnect();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
