// O Google envia apenas uma notificação de alteração; a reconciliação busca os
// eventos novamente usando o OAuth persistente da integração quando disponível.
export default async (req, res) => {
  const settings = await getGoogleSettings();
  const expected = settings.webhookToken;
  const received = String(req.headers['x-goog-channel-token'] || '').trim();
  if (expected && received !== expected) return res.status(401).end();
  res.status(204).end();
};
import { getGoogleSettings } from '../utils/googleSettings.js';

