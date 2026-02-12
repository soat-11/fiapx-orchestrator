import { Video } from "@core/domain/entities/video.entity";
import { TypeOrmVideo } from "../typeorm/entities/video.orm-entity";

export class VideoMapper {
  static toDomain(raw: TypeOrmVideo): Video {
    return new Video({
      id: raw.id,
      fileName: raw.fileName,
      s3KeyRaw: raw.s3KeyRaw,
      s3KeyZip: raw.s3KeyZip,
      status: raw.status,
      userId: raw.userId,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toPersistence(domain: Video): TypeOrmVideo {
    const entity = new TypeOrmVideo();
    entity.id = domain.id;
    entity.fileName = domain.fileName;
    entity.s3KeyRaw = domain.s3KeyRaw;
    entity.s3KeyZip = domain.s3KeyZip;
    entity.status = domain.status;
    entity.userId = domain.userId;

    return entity;
  }
}
