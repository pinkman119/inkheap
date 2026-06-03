import { httpClient } from './http';

export type LoginPayload = {
  username: string;
  password: string;
};

export type LoginResponse = {
  tokenType: string;
  accessToken: string;
  expiresIn: number;
  username: string;
  roles: string[];
};

type ApiLoginResponse = {
  tokenType?: string;
  accessToken?: string;
  expiresIn?: number;
  username: string;
  roles: string[];
  token_type?: string;
  access_token?: string;
  expires_in?: number;
};

export const login = async (payload: LoginPayload) => {
  const { data } = await httpClient.post<ApiLoginResponse>('/auth/login', payload);
  return {
    tokenType: data.tokenType ?? data.token_type ?? 'Bearer',
    accessToken: data.accessToken ?? data.access_token ?? '',
    expiresIn: data.expiresIn ?? data.expires_in ?? 0,
    username: data.username,
    roles: data.roles
  } satisfies LoginResponse;
};

export const logout = async () => {
  await httpClient.post('/auth/logout');
};
