import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IVideoRepository } from "../repositories/video-repository.interface";
import { IMessagingGateway } from "../interfaces/messaging-gateway.interface";

@Injectable()
export class StartVideoProcessingUseCase {
  private readonly logger = new Logger(StartVideoProcessingUseCase.name);
  private readonly queueUrl: string;

  constructor(
    private readonly videoRepository: IVideoRepository,
    private readonly messagingGateway: IMessagingGateway,
    private readonly configService: ConfigService,
  ) {
    this.queueUrl = this.configService.getOrThrow<string>(
      "AWS_SQS_PROCESSING_QUEUE_URL",
    );
  }

  async execute(videoId: string): Promise<void> {
    this.logger.log(
      `Iniciando solicitação de processamento para o vídeo: ${videoId}`,
    );

    const video = await this.videoRepository.findById(videoId);
    if (!video) {
      throw new NotFoundException("Vídeo não encontrado.");
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
  }
}
