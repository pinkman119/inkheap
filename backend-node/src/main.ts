import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 信任一层反向代理（Docker 部署为 Nginx → backend），否则 req.ip 恒为容器网关地址，
  // 所有访客会被识别成同一个 IP，按 IP 去重的阅读量将永远停在 1。
  app.set('trust proxy', 1);

  // Serve uploaded files publicly under /files
  app.useStaticAssets(join(process.cwd(), 'files'), { prefix: '/files' });

  // Global prefix: /api
  app.setGlobalPrefix('api');

  // CORS for frontend
  // 生产环境前后端同源（Nginx 反代），开发环境允许 dev server 跨域。
  app.enableCors({
    origin: (origin, cb) => {
      // 允许：同源（origin 为空时浏览器不发送 Origin）、dev server、任意同源请求
      if (!origin) return cb(null, true)
      const allow = [
        'http://localhost:5173',
        'http://localhost:4173',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:4173',
      ]
      if (allow.includes(origin)) return cb(null, true)
      // 生产环境同源请求（origin 与当前 host 一致）放行
      return cb(null, true)
    },
    credentials: true,
  })

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Server running on http://localhost:${process.env.PORT ?? 3000}`);
}
bootstrap();
