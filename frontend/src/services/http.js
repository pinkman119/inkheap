import axios from 'axios';
import router from '@/router';
import { useAuthStore } from '@/stores/auth';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8090/api';

export const httpClient = axios.create({
    baseURL: apiBaseUrl,
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 10000
});

export const isHttpError = (error, status) => {
    if (!axios.isAxiosError(error))
        return false;
    if (status === undefined) {
        return true;
    }
    return error.response?.status === status;
};

httpClient.interceptors.request.use((config) => {
    const authStore = useAuthStore();
    if (!authStore.ready) {
        authStore.initialize();
    }
    if (authStore.isAuthenticated && authStore.token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `${authStore.tokenType} ${authStore.token}`;
    }
    return config;
});

httpClient.interceptors.response.use(undefined, (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
        const authStore = useAuthStore();
        authStore.signOut();
        if (router.currentRoute.value.name !== 'login') {
            router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } }).catch(() => {
                /* noop */
            });
        }
    }
    return Promise.reject(error);
});
