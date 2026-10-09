// POST /gcal/calendars — lists the user's Google Calendars using an OAuth
// access token obtained client-side via Google Identity Services. The token
// is the user's own consent (not a server secret); we proxy the call through
// Express so the browser never talks to Google APIs directly.
//
// Body: { token }
export default async (req, res) => {
  const { token } = req.body || {};
  if (!token) {
    return res.status(422).json({ error: "token é obrigatório" });
  }

  const r = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) {
    throw new Error(`Google Calendar list failed: ${r.status} ${r.statusText}`);
  }
  const data = await r.json();
  res.json(data);
};
