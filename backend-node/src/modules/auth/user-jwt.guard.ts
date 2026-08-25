import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** 访客（微信用户）接口守卫：校验 role=user 的 JWT */
@Injectable()
export class UserJwtAuthGuard extends AuthGuard('user-jwt') {}
