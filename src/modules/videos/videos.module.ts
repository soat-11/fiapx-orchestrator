import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { VideosController } from "@infra/http/controllers/videos.controller";
import { CreateVideoUploadUseCase } from "@core/use-cases/create-video-upload.use-case";
import { StartVideoProcessingUseCase } from "@core/use-cases/start-video-processing.use-case";
import { DatabaseModule } from "@infra/database/database.module";
import { StorageModule } from "@infra/storage/storage.module";
import { MessagingModule } from "@infra/messaging/messaging.module";
import { UploadEventsListener } from "@infra/messaging/listeners/upload-events.listener";
import { FinishVideoProcessingUseCase } from "@core/use-cases/finish-video-processing.use-case";
import { VideoResultListener } from "@infra/messaging/listeners/video-result.listener";
import { ListUserVideosUseCase } from "@core/use-cases/list-user-videos.use-case";

@Module({
  imports: [ConfigModule, DatabaseModule, StorageModule, MessagingModule],
  controllers: [VideosController],
  providers: [
    // Use cases
    CreateVideoUploadUseCase,
    StartVideoProcessingUseCase,
    FinishVideoProcessingUseCase,
    ListUserVideosUseCase,

    // Listener
    UploadEventsListener,
    VideoResultListener,
  ],
})
export class VideosModule {}
