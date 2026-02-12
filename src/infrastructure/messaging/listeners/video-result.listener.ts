import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Message } from "@aws-sdk/client-sqs";
import { FinishVideoProcessingUseCase } from "@core/use-cases/finish-video-processing.use-case";
import { SqsBaseListener } from "../sqs/sqs-base.listener";

@Injectable()
export class VideoResultListener extends SqsBaseListener {
  constructor(
    configService: ConfigService,
    private readonly finishUseCase: FinishVideoProcessingUseCase,
  ) {
    super(configService, VideoResultListener.name, "AWS_SQS_RESULT_QUEUE_URL");
  }

  async handleMessage(message: Message): Promise<void> {
    try {
      let body;
      try {
        body = JSON.parse(message.Body);
      } catch (e) {
        this.logger.error(`⛔ Mensagem inválida (Não é JSON). Descartando.`);
        return;
      }

      this.logger.log(`📥 Processando resultado: ${JSON.stringify(body)}`);

      if (!body.videoId || !body.status) {
        this.logger.error(`⛔ Mensagem sem videoId ou status. Descartando.`);
        return;
      }

      const status = body.status.toUpperCase();
      const success = status === "DONE";

      if (success && !body.outputKey) {
        this.logger.error(`⛔ Status DONE mas sem outputKey. Descartando.`);
        return;
      }

      if (!success && !body.errorMessage) {
        body.errorMessage =
          "Erro desconhecido no processamento (Worker não enviou motivo).";
      }

      await this.finishUseCase.execute({
        videoId: body.videoId,
        success: success,
        zipKey: body.outputKey,
        errorMessage: body.errorMessage,
      });

      this.logger.log(`✅ Ciclo finalizado para o vídeo ${body.videoId}`);
    } catch (error) {
      if (error.message && error.message.includes("não encontrado")) {
        this.logger.warn(`⚠️ Vídeo não existe no banco. Limpando mensagem.`);
      } else {
        this.logger.error(`❌ Erro transiente: ${error.message}.`);
        throw error;
      }
    }
  }
}
