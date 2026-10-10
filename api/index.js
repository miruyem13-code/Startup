// Load the compiled backend, never raw TypeScript files, in the Vercel runtime.
let handler;
module.exports = async function (req, res) {
  try {
    handler ||= require('../.vercel-backend/handler.cjs').default;
  } catch (error) {
    console.error('Backend initialization failed:', error);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({
      message: 'Server configuration is incomplete. Please contact the administrator.',
      code: 'BACKEND_INITIALIZATION_FAILED',
    }));
    return;
  }
  return handler(req, res);
};
