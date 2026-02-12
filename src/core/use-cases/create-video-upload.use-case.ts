import { Injectable, Logger, Inject } from "@nestjs/common";
import { Video } from "../domain/entities/video.entity";
import { IVideoRepository } from "../repositories/video-repository.interface";
import { IStorageGateway } from "../interfaces/storage-gateway.interface";
import { Result } from "@shared/result";

export interface CreateVideoInput {
  fileName: string;
  userId: string;
}

export interface CreateVideoOutput {
  videoId: string;
  uploadUrl: string;
  status: string;
}

@Injectable()
export class CreateVideoUploadUseCase {
  private readonly logger = new Logger(CreateVideoUploadUseCase.name);

  constructor(
    @Inject("IVideoRepository")
    private readonly videoRepository: IVideoRepository,
    @Inject("IStorageGateway")
    private readonly storageGateway: IStorageGateway,
  ) {}

  async execute(input: CreateVideoInput): Promise<Result<CreateVideoOutput>> {
    this.logger.log(
      `[1/4] Iniciando processo de upload para o usuário: ${input.userId}`,
    );

    try {
      const video = new Video({
        fileName: input.fileName,
        userId: input.userId,
        s3KeyRaw: "",
      });

      this.logger.debug(`Video ID gerado pela entidade: ${video.id}`);

      this.logger.log(`[2/4] Solicitando Presigned URL...`);

      const { url, fileKey } = await this.storageGateway.generatePresignedUrl(
        input.fileName,
        video.id,
      );

      video.s3KeyRaw = fileKey;

      this.logger.log(`[3/4] Persistindo no Banco...`);

      await this.videoRepository.create(video);

      this.logger.log(`[4/4] Sucesso!`);

      return Result.ok<CreateVideoOutput>({
        videoId: video.id,
        uploadUrl: url,
        status: video.status,
      });
    } catch (error) {
      this.logger.error(`[ERRO] ${error.message}`, error.stack);
      return Result.fail<CreateVideoOutput>(error.message);
    }
  }
}
