/**
 * 配置工厂 - 加载配置
 */
import { registerAs } from '@nestjs/config';
import { AppConfig } from './config.interface';
import { baseConfig } from './config.base';
import { prodConfig } from './config.prod';

/**
 * 获取配置
 */
export function getConfig(): AppConfig {
    // 个人项目只需生产环境配置
    return {
        ...baseConfig,
        ...prodConfig,
    } as AppConfig;
}

/**
 * 注册为 NestJS 配置模块
 */
export const configRegister = registerAs('app', () => getConfig());

export * from './config.interface';
export * from './config.base';
export * from './config.prod';