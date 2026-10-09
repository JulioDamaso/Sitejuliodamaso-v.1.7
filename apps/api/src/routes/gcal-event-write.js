function requireToken(body) {
  if (!body?.token) {
    const error = new Error('token é obrigatório');
    error.statusCode = 422;
    throw error;
  }
}

function dateTime(value) {
  const text = String(value || '').replace(' ', 'T');
  return text.length === 16 ? `${text}:00` : text;
}

function calendarEventFromAppointment(appointment = {}) {
  const start = dateTime(appointment.date);
  const endDate = new Date(start);
  endDate.setMinutes(endDate.getMinutes() + Number(appointment.durationMinutes || 60));
  return {
    summary: appointment.title || 'Compromisso',
    description: appointment.notes || '',
    location: appointment.location || '',
    start: { dateTime: start, timeZone: 'America/Sao_Paulo' },
    end: { dateTime: endDate.toISOString(), timeZone: 'America/Sao_Paulo' },
    extendedProperties: {
      private: {
        jd_appointment_id: appointment.id || '',
        jd_process_id: appointment.process || '',
        jd_client_id: appointment.client || '',
      },
    },
  };
}

async function googleFetch(url, { token, method = 'GET', body } = {}) {
  const response = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const error = new Error(`Google Calendar respondeu ${response.status}${detail ? `: ${detail.slice(0, 240)}` : ''}`);
    error.statusCode = response.status === 401 ? 401 : 502;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}

export async function createGoogleEvent(req, res, next) {
  try {
    const { token, calendarId = 'primary', appointment } = req.body || {};
    requireToken(req.body);
    const data = await googleFetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, { token, method: 'POST', body: calendarEventFromAppointment(appointment) });
    res.json(data);
  } catch (error) { next(error); }
}

export async function updateGoogleEvent(req, res, next) {
  try {
    const { token, calendarId = 'primary', eventId, appointment } = req.body || {};
    requireToken(req.body);
    if (!eventId) return res.status(422).json({ error: 'eventId é obrigatório' });
    const data = await googleFetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, { token, method: 'PUT', body: calendarEventFromAppointment(appointment) });
    res.json(data);
  } catch (error) { next(error); }
}

export async function deleteGoogleEvent(req, res, next) {
  try {
    const { token, calendarId = 'primary', eventId } = req.body || {};
    requireToken(req.body);
    if (!eventId) return res.status(422).json({ error: 'eventId é obrigatório' });
    await googleFetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, { token, method: 'DELETE' });
    res.status(204).end();
  } catch (error) { next(error); }
}

export async function watchGoogleEvents(req, res, next) {
  try {
    const { token, calendarId = 'primary', address, channelId, ttl = 604800 } = req.body || {};
    requireToken(req.body);
    if (!address || !/^https:\/\//i.test(address)) return res.status(422).json({ error: 'address HTTPS é obrigatório para o webhook do Google.' });
    if (!channelId) return res.status(422).json({ error: 'channelId é obrigatório' });
    const settings = await getGoogleSettings();
    const data = await googleFetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/watch`, {
      token,
      method: 'POST',
      body: { id: channelId, type: 'web_hook', address, token: settings.webhookToken || channelId, params: { ttl: String(Math.min(Number(ttl) || 604800, 604800)) } },
    });
    res.json(data);
  } catch (error) { next(error); }
}

export { calendarEventFromAppointment };
import { getGoogleSettings } from '../utils/googleSettings.js';

