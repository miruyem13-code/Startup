import { build } from 'esbuild';

export async function bundleBackend(outfile = '.vercel-backend/handler.cjs') {
  return build({
    entryPoints: ['apps/api/src/vercel.ts'],
    outfile,
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'cjs',
    external: ['@prisma/client'],
    // Keep secrets as runtime environment reads; never substitute build-time values.
    logLevel: 'info',
  });
}
