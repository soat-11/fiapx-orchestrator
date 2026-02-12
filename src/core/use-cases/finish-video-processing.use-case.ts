import { Injectable, Logger, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IVideoRepository } from "../repositories/video-repository.interface";
import { IMessagingGateway } from "../interfaces/messaging-gateway.interface";
import { Result } from "@shared/result";

export interface FinishVideoInput {
  videoId: string;
  success: boolean;
  zipKey?: string;
  errorMessage?: string;
}

@Injectable()
export class FinishVideoProcessingUseCase {
  private readonly logger = new Logger(FinishVideoProcessingUseCase.name);
  private readonly emailQueueUrl: string;

  constructor(
    @Inject("IVideoRepository")
    private readonly videoRepository: IVideoRepository,
    @Inject("IMessagingGateway")
    private readonly messagingGateway: IMessagingGateway,
    private readonly configService: ConfigService,
  ) {
    this.emailQueueUrl = this.configService.getOrThrow<string>(
      "AWS_SQS_EMAIL_QUEUE_URL",
    );
  }

  async execute(input: FinishVideoInput): Promise<Result<void>> {
    try {
      this.logger.log(`Finalizando processamento do vídeo: ${input.videoId}`);

      const video = await this.videoRepository.findById(input.videoId);
      if (!video) {
        const msg = `Vídeo ${input.videoId} não encontrado para finalização.`;
        this.logger.error(msg);
        return Result.fail(msg);
      }

      if (input.success && input.zipKey) {
        video.complete(input.zipKey);
        this.logger.log(`Vídeo marcado como DONE. Zip: ${input.zipKey}`);
      } else {
        video.fail();
        this.logger.warn(`Vídeo marcado como ERROR.`);
      }

      await this.videoRepository.update(video);

      const emailPayload = {
        videoId: video.id,
        userId: video.userId,
        status: video.status,
        downloadLink: input.success ? input.zipKey : null,
        message: input.success
          ? "Seu vídeo está pronto!"
          : "Houve um erro no processamento.",
      };

      await this.messagingGateway.sendMessage(this.emailQueueUrl, emailPayload);
      this.logger.log(`Notificação enviada para fila de email.`);

      return Result.ok();
    } catch (error) {
      this.logger.error(`Erro ao finalizar vídeo: ${error.message}`);
      return Result.fail(error.message);
    }
  }
}
