// GET /gcal/status — reports whether Google Calendar OAuth is configured.
// The GOOGLE_OAUTH_CLIENT_ID is a user-supplied value (created in Google Cloud
// Console). It is safe to expose to the browser because web-app OAuth client
// IDs are public by design — only the user's own consent grants access.
import { isIntegrationConfigured } from "../utils/integrationConfig.js";
import { getGoogleSettings } from "../utils/googleSettings.js";

export default async (req, res) => {
  const settings = await getGoogleSettings();
  const clientId = settings.clientId;
  res.json({
    configured: Boolean(clientId) || isIntegrationConfigured("GOOGLE_OAUTH_CLIENT_ID"),
    clientId,
    webhookUrl: settings.webhookUrl,
    webhookConfigured: /^https:\/\//i.test(settings.webhookUrl),
  });
};
