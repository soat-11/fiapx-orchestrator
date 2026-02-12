import { VideoMapper } from "./video.mapper";
import { Video } from "@core/domain/entities/video.entity";
import { TypeOrmVideo } from "../typeorm/entities/video.orm-entity";
import { VideoStatus } from "@core/domain/enums/video-status.enum";

describe("VideoMapper", () => {
  it("should map persistence entity to domain entity", () => {
    const raw = new TypeOrmVideo();
    raw.id = "123";
    raw.fileName = "test.mp4";
    raw.s3KeyRaw = "raw/123.mp4";
    raw.s3KeyZip = "zip/123.zip";
    raw.status = VideoStatus.DONE;
    raw.userId = "user-1";
    raw.createdAt = new Date();
    raw.updatedAt = new Date();

    const domain = VideoMapper.toDomain(raw);

    expect(domain).toBeInstanceOf(Video);
    expect(domain.id).toBe(raw.id);
    expect(domain.fileName).toBe(raw.fileName);
    expect(domain.s3KeyRaw).toBe(raw.s3KeyRaw);
    expect(domain.s3KeyZip).toBe(raw.s3KeyZip);
    expect(domain.status).toBe(raw.status);
    expect(domain.userId).toBe(raw.userId);
    expect(domain.createdAt).toBe(raw.createdAt);
  });

  it("should map domain entity to persistence entity", () => {
    const domain = new Video({
      id: "123",
      fileName: "test.mp4",
      s3KeyRaw: "raw/123.mp4",
      s3KeyZip: "zip/123.zip",
      status: VideoStatus.DONE,
      userId: "user-1",
    });

    const persistence = VideoMapper.toPersistence(domain);

    expect(persistence).toBeInstanceOf(TypeOrmVideo);
    expect(persistence.id).toBe(domain.id);
    expect(persistence.fileName).toBe(domain.fileName);
    expect(persistence.s3KeyRaw).toBe(domain.s3KeyRaw);
    expect(persistence.s3KeyZip).toBe(domain.s3KeyZip);
    expect(persistence.status).toBe(domain.status);
    expect(persistence.userId).toBe(domain.userId);
  });
});
