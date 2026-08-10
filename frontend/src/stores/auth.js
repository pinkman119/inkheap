import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
const STORAGE_KEY = 'personaFlow.auth';
export const useAuthStore = defineStore('auth', () => {
    const token = ref(null);
    const tokenType = ref('Bearer');
    const username = ref(null);
    const roles = ref([]);
    const expiresAt = ref(null);
    const ready = ref(false);
    const isAuthenticated = computed(() => {
        if (!token.value)
            return false;
        if (!expiresAt.value)
            return true;
        return expiresAt.value > Date.now();
    });
    function persist() {
        if (!token.value) {
            localStorage.removeItem(STORAGE_KEY);
            return;
        }
        const payload = {
            token: token.value,
            tokenType: tokenType.value,
            username: username.value,
            roles: roles.value,
            expiresAt: expiresAt.value
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }
    function initialize() {
        if (ready.value)
            return;
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                token.value = parsed.token ?? null;
                tokenType.value = parsed.tokenType ?? 'Bearer';
                username.value = parsed.username ?? null;
                roles.value = parsed.roles ?? [];
                expiresAt.value = parsed.expiresAt ?? null;
                if (!isAuthenticated.value) {
                    clearSession();
                }
            }
            catch (error) {
                console.warn('[auth] Failed to parse persisted session', error);
                clearSession();
            }
        }
        ready.value = true;
    }
    function setSession(session) {
        token.value = session.token;
        tokenType.value = session.tokenType ?? 'Bearer';
        username.value = session.username;
        roles.value = Array.from(session.roles ?? []);
        expiresAt.value = Date.now() + session.expiresIn * 1000;
        ready.value = true;
        persist();
    }
    function clearSession() {
        token.value = null;
        username.value = null;
        roles.value = [];
        expiresAt.value = null;
        persist();
    }
    function signOut() {
        clearSession();
    }
    return {
        ready,
        token,
        tokenType,
        username,
        roles,
        expiresAt,
        isAuthenticated,
        initialize,
        setSession,
        clearSession,
        signOut
    };
});
