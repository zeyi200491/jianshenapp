import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppExceptionFilter } from './common/filters/app-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AppException } from './common/utils/app.exception';
import { resolveAllowedOrigins } from './config/cors.config';
import { shouldEnableSwagger, validateApiSecurityConfig } from './config/security.config';

async function bootstrap() {
  validateApiSecurityConfig();
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: resolveAllowedOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CampusFit-CSRF'],
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: () => new AppException('VALIDATION_ERROR', '参数校验失败', 400),
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new AppExceptionFilter());

  if (shouldEnableSwagger()) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('CampusFit AI API')
      .setDescription('CampusFit AI MVP 后端接口文档')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, swaggerDocument);
  }

  const port = Number(process.env.API_PORT ?? process.env.PORT ?? 3000);
  const host = process.env.API_HOST ?? '127.0.0.1';
  await app.listen(port, host);
}

void bootstrap();
