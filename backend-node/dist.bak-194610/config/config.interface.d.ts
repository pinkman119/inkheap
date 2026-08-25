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
