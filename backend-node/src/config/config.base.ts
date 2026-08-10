/**
 * 基础配置
 */
import { AppConfig } from './config.interface';

export const baseConfig: Pick<AppConfig, 'app'> = {
  app: {
    name: 'personal-profile-backend',
    port: 3000,
    env: 'production',
    prefix: '/api',
  },
};