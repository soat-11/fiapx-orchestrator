import { Injectable, Logger } from "@nestjs/common";
import { Video } from "../domain/entities/video.entity";
import { IVideoRepository } from "../repositories/video-repository.interface";
import { IStorageGateway } from "../interfaces/storage-gateway.interface";

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
    private readonly videoRepository: IVideoRepository,
    private readonly storageGateway: IStorageGateway,
  ) {}

  async execute(input: CreateVideoInput): Promise<CreateVideoOutput> {
    this.logger.log(
      `[1/4] Iniciando processo de upload para o usuário: ${input.userId} | Arquivo: ${input.fileName}`,
    );

    try {
      this.logger.log(`[2/4] Solicitando Presigned URL ao Storage Gateway...`);
      const { url, fileKey } = await this.storageGateway.generatePresignedUrl(
        input.fileName,
      );
      this.logger.debug(`URL gerada para a key: ${fileKey}`);

      const video = new Video({
        fileName: input.fileName,
        userId: input.userId,
        s3KeyRaw: fileKey,
      });

      this.logger.log(`[3/4] Persistindo entidade Video no Banco de Dados...`);
      await this.videoRepository.create(video);
      this.logger.debug(`Video ID gerado: ${video.id}`);

      this.logger.log(
        `[4/4] Processo finalizado com sucesso! Retornando dados.`,
      );

      return {
        videoId: video.id,
        uploadUrl: url,
        status: video.status,
      };
    } catch (error) {
      this.logger.error(
        `[ERRO] Falha ao criar upload de vídeo: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
