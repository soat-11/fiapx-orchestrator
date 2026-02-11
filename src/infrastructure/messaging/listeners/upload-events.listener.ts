import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";
import { StartVideoProcessingUseCase } from "@core/use-cases/start-video-processing.use-case";

@Injectable()
export class UploadEventsListener implements OnModuleInit {
  private readonly logger = new Logger(UploadEventsListener.name);
  private readonly sqsClient: SQSClient;
  private readonly queueUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly startProcessingUseCase: StartVideoProcessingUseCase,
  ) {
    this.queueUrl = this.configService.getOrThrow<string>(
      "AWS_SQS_UPLOAD_QUEUE_URL",
    );

    this.sqsClient = new SQSClient({
      region: this.configService.get<string>("AWS_REGION"),
      endpoint: this.configService.get<string>("AWS_ENDPOINT"),
      credentials: {
        accessKeyId:
          this.configService.get<string>("AWS_ACCESS_KEY_ID") || "teste",
        secretAccessKey:
          this.configService.get<string>("AWS_SECRET_ACCESS_KEY") || "teste",
      },
    });
  }

  onModuleInit() {
    this.listen();
  }

  async listen() {
    this.logger.log(`🎧 Ouvindo eventos de upload na fila: ${this.queueUrl}`);

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
        this.logger.error(`Erro ao ler fila SQS: ${error.message}`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  private async handleMessage(message: any) {
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

      await this.deleteMessage(message);
    } catch (error) {
      if (error.message.includes("não encontrado") || error.status === 404) {
        this.logger.error(
          `⛔ Erro Permanente: ${error.message}. Removendo mensagem da fila para evitar loop.`,
        );
        await this.deleteMessage(message);
      } else {
        this.logger.error(
          `❌ Erro Transiente: ${error.message}. A mensagem voltará para a fila em breve.`,
        );
      }
    }
  }

  // Helper para não repetir código
  private async deleteMessage(message: any) {
    await this.sqsClient.send(
      new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: message.ReceiptHandle,
      }),
    );
  }
}
