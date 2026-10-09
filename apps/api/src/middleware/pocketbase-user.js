const POCKETBASE_HOST = String(process.env.POCKETBASE_URL || 'http://localhost:8090').replace(/\/$/, '');

export async function requirePocketBaseUser(req, res, next) {
  const header = String(req.headers.authorization || '').trim();
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'Sessão ausente.' });
  try {
    const response = await fetch(`${POCKETBASE_HOST}/api/collections/users/auth-refresh`, {
      method: 'POST',
      headers: { Authorization: token, Accept: 'application/json' },
    });
    if (!response.ok) return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
    const payload = await response.json();
    req.authUser = payload?.record || payload;
    req.authToken = token;
    return next();
  } catch (error) {
    return res.status(503).json({
      error: 'PocketBase está indisponível. Inicie o PocketBase na porta 8090 e tente novamente.',
      code: 'POCKETBASE_UNAVAILABLE',
    });
  }
}
