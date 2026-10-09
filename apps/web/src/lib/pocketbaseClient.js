import Pocketbase from 'pocketbase';

const POCKETBASE_API_URL = import.meta.env.VITE_POCKETBASE_URL || (import.meta.env.DEV ? 'http://localhost:8090' : '/hcgi/platform');

const pocketbaseClient = new Pocketbase(POCKETBASE_API_URL);
pocketbaseClient.autoCancellation(false);

export default pocketbaseClient;

export { pocketbaseClient };
