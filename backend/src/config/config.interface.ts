/**
 * 基础配置接口定义
 * 所有环境配置必须实现此接口
 */
export interface AppConfig {
  app: {
    name: string;
    port: number;
    env: string;
    prefix: string;
  };
  database?: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  };
  jwt?: {
    secret: string;
    expiresIn: string;
  };
  redis?: {
    host: string;
    port: number;
  };
}