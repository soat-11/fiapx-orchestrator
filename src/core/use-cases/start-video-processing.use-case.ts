import { Injectable, Logger, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IVideoRepository } from "../repositories/video-repository.interface";
import { IMessagingGateway } from "../interfaces/messaging-gateway.interface";
import { Result } from "@shared/result";

@Injectable()
export class StartVideoProcessingUseCase {
  private readonly logger = new Logger(StartVideoProcessingUseCase.name);
  private readonly queueUrl: string;

  constructor(
    @Inject("IVideoRepository")
    private readonly videoRepository: IVideoRepository,
    @Inject("IMessagingGateway")
    private readonly messagingGateway: IMessagingGateway,
    private readonly configService: ConfigService,
  ) {
    this.queueUrl = this.configService.getOrThrow<string>(
      "AWS_SQS_PROCESSING_QUEUE_URL",
    );
  }

  async execute(videoId: string): Promise<Result<void>> {
    try {
      this.logger.log(
        `Iniciando solicitação de processamento para o vídeo: ${videoId}`,
      );

      const video = await this.videoRepository.findById(videoId);
      if (!video) {
        return Result.fail("Vídeo não encontrado.");
      }

      video.startProcessing();
      await this.videoRepository.update(video);
      this.logger.log(`Status do vídeo atualizado para PROCESSING.`);

      const messagePayload = {
        videoId: video.id,
        inputBucket: this.configService.get<string>("AWS_S3_BUCKET_RAW"),
        inputKey: video.s3KeyRaw,
      };

      await this.messagingGateway.sendMessage(this.queueUrl, messagePayload);
      this.logger.log(`Mensagem enviada para a fila SQS: ${this.queueUrl}`);

      return Result.ok();
    } catch (error) {
      this.logger.error(`Erro ao iniciar processamento: ${error.message}`);
      return Result.fail(error.message);
    }
  }
}
