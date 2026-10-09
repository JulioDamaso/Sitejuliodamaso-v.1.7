import Pocketbase from 'pocketbase';
import logger from './logger.js';

const POCKETBASE_HOST = String(process.env.POCKETBASE_URL || 'http://localhost:8090').replace(/\/$/, '');

async function waitForHealth({ retries = 10, delayMs = 1000 } = {}) {
    for (let i = 1; i <= retries; i++) {
        try {
            const response = await fetch(`${POCKETBASE_HOST}/api/health`, { method: 'HEAD' });

            if (response.ok) {
                return;
            }
        } catch {
            // PocketBase not reachable yet; retry below
        }

        logger.warn(`PocketBase not ready, retrying (${i}/${retries})...`);

        await new Promise((r) => setTimeout(r, delayMs));
    }

    throw new Error(`PocketBase health check failed after ${retries} retries`);
}

const pocketbaseClient = new Pocketbase(POCKETBASE_HOST);

pocketbaseClient.autoCancellation(false);

let authPromise = null;
const superuserEmail = String(process.env.PB_SUPERUSER_EMAIL || '').trim();
const superuserPassword = String(process.env.PB_SUPERUSER_PASSWORD || '');

function hasSuperuserCredentials() {
    return Boolean(superuserEmail && superuserPassword);
}

async function authenticateSuperuser() {
    if (!hasSuperuserCredentials()) {
        logger.warn('PocketBase superuser credentials are not configured; API will start without server-side authentication.');
        return false;
    }

    if (!authPromise) {
        authPromise = pocketbaseClient.collection('_superusers').authWithPassword(
            superuserEmail,
            superuserPassword,
        ).finally(() => {
            authPromise = null;
        });
    }

    await authPromise;
    return pocketbaseClient.authStore.isValid;
}

pocketbaseClient.beforeSend = async function (url, options) {
    if (url.includes('/api/collections/_superusers/auth-with-password')) {
        return { url, options };
    }

    if (!pocketbaseClient.authStore.isValid && hasSuperuserCredentials()) {
        await authenticateSuperuser();
    }

    if (pocketbaseClient.authStore.isValid && pocketbaseClient.authStore.token) {
        options.headers = options.headers || {};
        options.headers['Authorization'] = pocketbaseClient.authStore.token;
    }

    return { url, options };
};

(async () => {
    try {
        await waitForHealth();

        if (hasSuperuserCredentials()) {
            await authenticateSuperuser();
            logger.info('PocketBase client initialized with server-side authentication');
        } else {
            logger.warn('PocketBase client initialized without server-side authentication');
        }
    } catch (err) {
        pocketbaseClient.authStore.clear();
        logger.error('Failed to authenticate PocketBase superuser; API will remain available for public routes:', err);
    }
})();

export default pocketbaseClient;
export { pocketbaseClient };
