import { Router } from 'express';
import { requirePocketBaseUser } from '../middleware/pocketbase-user.js';
import { getGoogleSettings, saveGoogleSettings } from '../utils/googleSettings.js';

const router = Router();

function requireAdmin(req, res, next) {
  if (!['owner', 'admin'].includes(req.authUser?.role)) return res.status(403).json({ error: 'Apenas administradores podem configurar integrações.' });
  return next();
}

router.use(requirePocketBaseUser, requireAdmin);

router.get('/', async (req, res, next) => {
  try {
    const settings = await getGoogleSettings();
    res.json({
      configured: Boolean(settings.clientId),
      clientId: settings.clientId,
      webhookUrl: settings.webhookUrl,
      webhookConfigured: /^https:\/\//i.test(settings.webhookUrl),
      webhookTokenConfigured: Boolean(settings.webhookToken),
    });
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const { clientId = '', webhookUrl = '', webhookToken } = req.body || {};
    const normalizedClientId = String(clientId).trim();
    const normalizedWebhookUrl = String(webhookUrl).trim();
    if (normalizedClientId && !/^[\w-]+\.apps\.googleusercontent\.com$/i.test(normalizedClientId)) {
      return res.status(422).json({ error: 'Client ID OAuth inválido. Use o formato *.apps.googleusercontent.com.' });
    }
    if (normalizedWebhookUrl && !/^https:\/\//i.test(normalizedWebhookUrl)) {
      return res.status(422).json({ error: 'A URL do webhook deve começar com https://.' });
    }
    const settings = await saveGoogleSettings({
      clientId: normalizedClientId,
      webhookUrl: normalizedWebhookUrl,
      ...(webhookToken !== undefined ? { webhookToken: String(webhookToken).trim() } : {}),
    });
    res.json({
      configured: Boolean(settings.clientId),
      clientId: settings.clientId,
      webhookUrl: settings.webhookUrl,
      webhookConfigured: /^https:\/\//i.test(settings.webhookUrl),
      webhookTokenConfigured: Boolean(settings.webhookToken),
    });
  } catch (error) { next(error); }
});

export default router;
