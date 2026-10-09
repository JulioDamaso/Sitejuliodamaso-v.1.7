import { Router } from 'express';
import healthCheck from './health-check.js';
import gcalStatus from './gcal-status.js';
import gcalCalendars from './gcal-calendars.js';
import gcalEvents from './gcal-events.js';
import { createGoogleEvent, updateGoogleEvent, deleteGoogleEvent, watchGoogleEvents } from './gcal-event-write.js';
import gcalWebhook from './gcal-webhook.js';
import legalMonitoring from './legal-monitoring.js';
import googleSettings from './google-settings.js';
import maintenance from './maintenance.js';
import { requirePocketBaseUser } from '../middleware/pocketbase-user.js';

const router = Router();

export default () => {
    router.get('/', (req, res) => {
        res.json({
            name: 'Site do Escritório API',
            status: 'ok',
            health: '/health',
        });
    });

    router.get('/health', healthCheck);

    // Google Agenda — OAuth (Google Identity Services) + proxy de API
    router.get('/gcal/status', gcalStatus);
    // A Google access token is supplied by the browser after the official
    // consent screen, but every proxy operation must still belong to a
    // logged-in office user. The webhook remains public and validates its
    // Google channel token in gcal-webhook.js.
    router.use('/gcal', (req, res, next) => {
        if (req.path === '/status' || req.path === '/webhook') return next();
        return requirePocketBaseUser(req, res, next);
    });
    router.post('/gcal/calendars', gcalCalendars);
    router.post('/gcal/events', gcalEvents);
    router.post('/gcal/events/create', createGoogleEvent);
    router.post('/gcal/events/update', updateGoogleEvent);
    router.post('/gcal/events/delete', deleteGoogleEvent);
    router.post('/gcal/events/watch', watchGoogleEvents);
    router.post('/gcal/webhook', gcalWebhook);
    router.use('/integrations/google', googleSettings);
    router.use('/maintenance', maintenance);

    // DJEN + DataJud + cálculo de prazo
    router.use('/legal', legalMonitoring);

    return router;
};

