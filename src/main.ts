import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService>(ConfigService);
  app.useGlobalPipes(new ValidationPipe());

  app.enableCors({
    origin: '*',
    allowedHeaders: ['x-google-refresh-token'],
    methods: ['GET'],
    credentials: true,
  });

  await app.listen(3001, '0.0.0.0');

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: "auth-client",
        brokers: [config.getOrThrow<string>("KAFKA_BROKER_ADDRESS")],
      },
      consumer: {
        groupId: 'auth-messaging-service-consumer',
        allowAutoTopicCreation: true,
      }
    },
  });

  await app.startAllMicroservices();
}
bootstrap();
