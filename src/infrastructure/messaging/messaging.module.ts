import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SqsMessagingService } from "./sqs/sqs-messaging.service";

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: "IMessagingGateway",
      useClass: SqsMessagingService,
    },
  ],
  exports: ["IMessagingGateway"],
})
export class MessagingModule {}
