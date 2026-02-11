import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";
import { FinishVideoProcessingUseCase } from "@core/use-cases/finish-video-processing.use-case";

@Injectable()
export class VideoResultListener implements OnModuleInit {
  private readonly logger = new Logger(VideoResultListener.name);
  private readonly sqsClient: SQSClient;
  private readonly queueUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly finishUseCase: FinishVideoProcessingUseCase,
  ) {
    this.queueUrl = this.configService.getOrThrow<string>(
      "AWS_SQS_RESULT_QUEUE_URL",
    );

    this.sqsClient = new SQSClient({
      region: this.configService.get<string>("AWS_REGION"),
      endpoint: this.configService.get<string>("AWS_ENDPOINT"),
      credentials: {
        accessKeyId: this.configService.get<string>("AWS_ACCESS_KEY_ID"),
        secretAccessKey: this.configService.get<string>(
          "AWS_SECRET_ACCESS_KEY",
        ),
      },
    });
  }

  onModuleInit() {
    this.logger.log(`🎧 Ouvindo resultados na fila: ${this.queueUrl}`);
    this.listen();
  }

  async listen() {
    while (true) {
      try {
        const command = new ReceiveMessageCommand({
          QueueUrl: this.queueUrl,
          MaxNumberOfMessages: 1,
          WaitTimeSeconds: 20,
        });

        const response = await this.sqsClient.send(command);

        if (response.Messages && response.Messages.length > 0) {
          for (const message of response.Messages) {
            await this.handleMessage(message);
          }
        }
      } catch (error) {
        this.logger.error(`Erro de conexão SQS: ${error.message}`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  /*************************************/
  /********* PAYLOAD EXAMPLES **********/
  /*************************************/

  // Sucesso (Vídeo Processado)
  // {
  //   "videoId": "c2787984-0494-4aa6-a83a-5b419664e756",
  //   "status": "DONE",
  //   "outputKey": "zips/c2787984-0494-4aa6-a83a-5b419664e756.zip",
  //   "metadata": {
  //     "duration": 120,
  //     "size": 5000000
  //   }
  // }

  // Erro (Falha no FFmpeg/Download)
  // {
  //   "videoId": "c2787984-0494-4aa6-a83a-5b419664e756",
  //   "status": "ERROR",
  //   "errorMessage": "Falha ao baixar arquivo do S3: Access Denied"
  // }

  private async handleMessage(message: any) {
    try {
      let body;
      try {
        body = JSON.parse(message.Body);
      } catch (e) {
        this.logger.error(`⛔ Mensagem inválida (Não é JSON). Descartando.`);
        await this.deleteMessage(message);
        return;
      }

      this.logger.log(`📥 Processando resultado: ${JSON.stringify(body)}`);
      if (!body.videoId || !body.status) {
        this.logger.error(`⛔ Mensagem sem videoId ou status. Descartando.`);
        await this.deleteMessage(message);
        return;
      }

      const status = body.status.toUpperCase();
      const success = status === "DONE";

      if (success && !body.outputKey) {
        this.logger.error(`⛔ Status DONE mas sem outputKey. Descartando.`);
        await this.deleteMessage(message);
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

      await this.deleteMessage(message);
      this.logger.log(`✅ Ciclo finalizado para o vídeo ${body.videoId}`);
    } catch (error) {
      if (error.message && error.message.includes("não encontrado")) {
        this.logger.warn(`⚠️ Vídeo não existe no banco. Limpando mensagem.`);
        await this.deleteMessage(message);
      } else {
        this.logger.error(
          `❌ Erro transiente: ${error.message}. Tentando novamente.`,
        );
      }
    }
  }

  private async deleteMessage(message: any) {
    try {
      await this.sqsClient.send(
        new DeleteMessageCommand({
          QueueUrl: this.queueUrl,
          ReceiptHandle: message.ReceiptHandle,
        }),
      );
    } catch (err) {
      this.logger.error(`Erro ao deletar mensagem SQS: ${err.message}`);
    }
  }
}
