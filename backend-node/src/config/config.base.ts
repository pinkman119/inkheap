/**
 * 基础配置
 */
import { AppConfig } from './config.interface';

export const baseConfig: Partial<AppConfig> = {
  app: {
    name: 'personal-profile-backend',
    port: 3000,
    env: 'production',
    prefix: '/api',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'inkheap-admin-secret-key-2026',
    expiresIn: '7d',
  },
};