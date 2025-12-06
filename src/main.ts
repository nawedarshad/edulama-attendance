import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // ✅ MUST ADD cookie-parser middleware
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enhanced CORS configuration
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://167.71.229.252:3000',
      'http://localhost:3002',
    ],
    methods: 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    credentials: true, // ✅ IMPORTANT: Allow credentials
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'Origin',
      'Access-Control-Allow-Origin',
      'Cookie',
      'Set-Cookie',
      'access-control-allow-credentials',
    ],
    exposedHeaders: ['Authorization', 'Set-Cookie'],
    maxAge: 86400,
  });

  // Request logging middleware
  app.use((req, res, next) => {
    console.log('\n🔵 ====== INCOMING REQUEST ======');
    console.log(`📅 ${new Date().toISOString()}`);
    console.log(`🌐 ${req.method} ${req.url}`);
    console.log(`📍 Origin: ${req.headers.origin}`);
    console.log(`🔑 Auth Header: ${req.headers.authorization || 'None'}`);
    console.log(`🍪 Cookie Header: ${req.headers.cookie || 'None'}`);
    console.log(`🍪 Parsed Cookies:`, req.cookies);
    console.log('🔵 ===============================\n');
    next();
  });

  const port = process.env.PORT || 3002;
  await app.listen(port);
  console.log(`🚀 Announcement service running on port ${port}`);
  console.log(`📡 API: http://localhost:${port}/api`);
  console.log(
    `🔐 Auth Service: ${process.env.AUTH_MS_URL || 'http://167.71.229.252:4000/auth'}`,
  );
}
bootstrap();
