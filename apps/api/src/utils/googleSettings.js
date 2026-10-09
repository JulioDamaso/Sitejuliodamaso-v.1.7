import pocketbaseClient from './pocketbaseClient.js';

const KEYS = {
  clientId: 'google_oauth_client_id',
  webhookUrl: 'google_calendar_webhook_url',
  webhookToken: 'google_calendar_webhook_token',
};

async function readSetting(key) {
  try {
    const record = await pocketbaseClient.collection('site_settings').getFirstListItem(
      pocketbaseClient.filter('key = {:key}', { key }),
    );
    return String(record?.value || '').trim();
  } catch (_) {
    return '';
  }
}

export async function getGoogleSettings() {
  const [storedClientId, storedWebhookUrl, storedWebhookToken] = await Promise.all([
    readSetting(KEYS.clientId),
    readSetting(KEYS.webhookUrl),
    readSetting(KEYS.webhookToken),
  ]);
  return {
    clientId: storedClientId || String(process.env.GOOGLE_OAUTH_CLIENT_ID || '').trim(),
    webhookUrl: storedWebhookUrl || String(process.env.GOOGLE_CALENDAR_WEBHOOK_URL || '').trim(),
    webhookToken: storedWebhookToken || String(process.env.GOOGLE_CALENDAR_WEBHOOK_TOKEN || '').trim(),
  };
}

export async function saveGoogleSettings(values = {}) {
  const entries = [
    [KEYS.clientId, values.clientId],
    [KEYS.webhookUrl, values.webhookUrl],
    [KEYS.webhookToken, values.webhookToken],
  ];
  for (const [key, value] of entries) {
    if (value === undefined) continue;
    const normalized = String(value || '').trim();
    let record = null;
    try {
      record = await pocketbaseClient.collection('site_settings').getFirstListItem(
        pocketbaseClient.filter('key = {:key}', { key }),
      );
    } catch (_) {}
    if (record) await pocketbaseClient.collection('site_settings').update(record.id, { value: normalized });
    else await pocketbaseClient.collection('site_settings').create({ key, value: normalized });
  }
  return getGoogleSettings();
}

export { KEYS as GOOGLE_SETTING_KEYS };
