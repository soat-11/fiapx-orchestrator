import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { IStorageGateway } from "@core/interfaces/storage-gateway.interface";
import { S3StorageService } from "./s3-storage.service";

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: IStorageGateway,
      useClass: S3StorageService,
    },
  ],
  exports: [IStorageGateway],
})
export class StorageModule {}
