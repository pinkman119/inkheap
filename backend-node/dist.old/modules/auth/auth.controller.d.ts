import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            username: string;
            role: string;
        };
    }>;
    getProfile(req: any): Promise<{
        username: string;
        id: string;
        role: string;
        createdAt: Date;
    } | null>;
}
