import { AppConfig } from './config.interface';
export declare function getConfig(): AppConfig;
export declare const configRegister: (() => AppConfig) & import("@nestjs/config").ConfigFactoryKeyHost<AppConfig>;
export * from './config.interface';
export * from './config.base';
export * from './config.prod';
