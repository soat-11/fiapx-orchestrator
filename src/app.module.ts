import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "@infra/database/database.module";
import { MessagingModule } from "@infra/messaging/messaging.module";
import { VideosModule } from "@modules/videos/videos.module";
import { StorageModule } from "@infra/storage/storage.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    DatabaseModule,
    MessagingModule,
    StorageModule,
    VideosModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
