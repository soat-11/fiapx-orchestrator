import { Module } from "@nestjs/common";
import { VideosController } from "@infra/http/controllers/videos.controller";
import { CreateVideoUploadUseCase } from "@core/use-cases/create-video-upload.use-case";
import { DatabaseModule } from "@infra/database/database.module";
import { StorageModule } from "@infra/storage/storage.module";

@Module({
  imports: [DatabaseModule, StorageModule],
  controllers: [VideosController],
  providers: [CreateVideoUploadUseCase],
})
export class VideosModule {}
