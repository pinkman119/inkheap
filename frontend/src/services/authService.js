import { httpClient } from './http';
export const login = async (payload) => {
    const { data } = await httpClient.post('/auth/login', payload);
    return {
        tokenType: data.tokenType ?? data.token_type ?? 'Bearer',
        accessToken: data.accessToken ?? data.access_token ?? '',
        expiresIn: data.expiresIn ?? data.expires_in ?? 0,
        username: data.username,
        roles: data.roles
    };
};
export const logout = async () => {
    await httpClient.post('/auth/logout');
};
