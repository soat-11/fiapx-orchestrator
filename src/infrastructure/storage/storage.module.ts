import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { S3StorageService } from "./s3-storage.service";

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: "IStorageGateway",
      useClass: S3StorageService,
    },
  ],
  exports: ["IStorageGateway"],
})
export class StorageModule {}
