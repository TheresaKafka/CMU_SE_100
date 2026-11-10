import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Cung cấp giao diện tĩnh Web POS, KDS và Admin từ thư mục /public
  app.useStaticAssets(join(process.cwd(), 'public'));

  // Cấu hình Global Prefix cho REST API
  app.setGlobalPrefix('api/v1');

  // Cho phép CORS cho POS, Web Admin, Mobile
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Validation Pipe toàn cục loại bỏ trường rác theo AI_RULES.md
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Response Format Interceptor thống nhất { statusCode, message, data, timestamp }
  app.useGlobalInterceptors(new TransformResponseInterceptor());

  // Global Exception Filter xử lý lỗi tập trung
  app.useGlobalFilters(new AllExceptionsFilter());

  // Cấu hình Swagger/OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Omnichannel Coffee POS & Management API')
    .setDescription(
      'Hệ thống API RESTful dành cho POS Touchscreen tại quầy, KDS màn hình pha chế Barista, Mobile Order và Quản trị trung tâm (HQ Dashboard).',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Nhập mã JWT Access Token vào đây (Bearer <token>)',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env['PORT'] ? parseInt(process.env['PORT'], 10) : 8080;
  await app.listen(port, '0.0.0.0');
  logger.log(`Server is running at: http://localhost:${port}/api/v1`);
  logger.log(`Swagger OpenAPI Documentation: http://localhost:${port}/api/docs`);
}

bootstrap().catch((err: unknown) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
