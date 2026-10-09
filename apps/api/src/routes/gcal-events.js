// POST /gcal/events — lists events from a Google Calendar using an OAuth
// access token obtained client-side via Google Identity Services. Proxied
// through Express so the browser never calls Google APIs directly.
//
// Body: { token, calendarId?, timeMin?, timeMax? }
export default async (req, res) => {
  const { token, calendarId = "primary", timeMin, timeMax } = req.body || {};
  if (!token) {
    return res.status(422).json({ error: "token é obrigatório" });
  }

  const params = new URLSearchParams({
    maxResults: "250",
    singleEvents: "true",
    orderBy: "startTime",
  });
  if (timeMin) params.set("timeMin", timeMin);
  if (timeMax) params.set("timeMax", timeMax);

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`;
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) {
    throw new Error(`Google Calendar events failed: ${r.status} ${r.statusText}`);
  }
  const data = await r.json();
  res.json(data);
};
