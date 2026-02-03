import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  // app.useGlobalFilters(new GlobalExceptionFilter());
  app.enableCors({
    origin: true, // Allow all origins
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // BigInt Serialization Fix
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };

  await app.listen(process.env.PORT ?? 4005);
}
bootstrap();
