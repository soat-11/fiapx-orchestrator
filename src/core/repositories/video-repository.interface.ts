import { Video } from "../domain/entities/video.entity";

export abstract class IVideoRepository {
  abstract create(video: Video): Promise<void>;
  abstract findById(id: string): Promise<Video | null>;
  abstract update(video: Video): Promise<void>;
}
