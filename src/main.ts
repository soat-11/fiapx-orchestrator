import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AllExceptionsFilter } from "@infra/http/filters/all-exception.filter";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";

async function bootstrap() {
  const logger = new Logger("Bootstrap");

  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>("PORT", 3000);

  const config = new DocumentBuilder()
    .setTitle("FIAP Orchestrator")
    .setDescription("Microsserviço de Orquestração de Vídeos")
    .setVersion("1.0")
    .addTag("videos")
    .build();

  const document = SwaggerModule.createDocument(app, config);

  app.useGlobalFilters(new AllExceptionsFilter());

  app.use(
    "/docs",
    apiReference({
      spec: {
        content: document,
      },
      theme: "purple",
      darkMode: true,
    }),
  );

  app.enableShutdownHooks();
  await app.listen(port);

  logger.log(`🚀 Orchestrator is running on: http://localhost:${port}`);
  logger.log(`📄 Documentation (Scalar): http://localhost:${port}/docs`);
}

bootstrap();
