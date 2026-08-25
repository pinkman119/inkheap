import type { Response } from 'express';
export declare class ProxyController {
    private readonly logger;
    image(url: string, res: Response): Promise<void>;
}
