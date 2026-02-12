import { Injectable, Inject } from "@nestjs/common";
import { IVideoRepository } from "@core/repositories/video-repository.interface";
import { Result } from "@shared/result";

export interface ListUserVideosOutput {
  videoId: string;
  fileName: string;
  status: string;
  createdAt: Date;
  downloadUrl?: string;
}

@Injectable()
export class ListUserVideosUseCase {
  constructor(
    @Inject("IVideoRepository")
    private readonly videoRepo: IVideoRepository,
  ) {}

  async execute(userId: string): Promise<Result<ListUserVideosOutput[]>> {
    try {
      const videos = await this.videoRepo.findAllByUserId(userId);

      const output = videos.map((video) => ({
        videoId: video.id,
        fileName: video.fileName,
        status: video.status,
        createdAt: video.createdAt,
        downloadUrl: video.s3KeyZip ? video.s3KeyZip : null,
      }));

      return Result.ok<ListUserVideosOutput[]>(output);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unexpected error";
      return Result.fail<ListUserVideosOutput[]>(errorMessage);
    }
  }
}
