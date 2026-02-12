import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Message } from "@aws-sdk/client-sqs";
import { StartVideoProcessingUseCase } from "@core/use-cases/start-video-processing.use-case";
import { SqsBaseListener } from "../sqs/sqs-base.listener";

@Injectable()
export class UploadEventsListener extends SqsBaseListener {
  constructor(
    configService: ConfigService,
    private readonly startProcessingUseCase: StartVideoProcessingUseCase,
  ) {
    super(configService, UploadEventsListener.name, "AWS_SQS_UPLOAD_QUEUE_URL");
  }

  async handleMessage(message: Message): Promise<void> {
    try {
      const body = JSON.parse(message.Body);
      if (!body.Records) return;

      const s3Key = body.Records[0].s3.object.key;
      const decodedKey = decodeURIComponent(s3Key.replace(/\+/g, " "));

      this.logger.log(`📦 Processando arquivo: ${decodedKey}`);

      const match = decodedKey.match(/raw\/([a-f0-9\-]{36})-/);

      if (match && match[1]) {
        const videoId = match[1];
        await this.startProcessingUseCase.execute(videoId);
        this.logger.log(`✅ Sucesso! Mensagem processada.`);
      } else {
        this.logger.warn(
          `⚠️ Arquivo ignorado (padrão incorreto): ${decodedKey}`,
        );
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: any) {
    if (error.message.includes("não encontrado") || error.status === 404) {
      this.logger.error(`⛔ Erro Permanente: ${error.message}.`);
    } else {
      this.logger.error(`❌ Erro Transiente: ${error.message}.`);
      throw error;
    }
  }
}
