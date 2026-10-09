import pb from './pocketbaseClient';

export const API_SERVER_URL = '/hcgi/api';

function withSessionHeader(options = {}) {
    const headers = new Headers(options.headers || {});
    const sessionToken = pb.authStore.token;
    if (sessionToken && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${sessionToken}`);
    return { ...options, headers };
}

const apiServerClient = {
    fetch: async (url, options = {}) => {
        return await window.fetch(API_SERVER_URL + url, withSessionHeader(options));
    }
};

export default apiServerClient;

export { apiServerClient };
