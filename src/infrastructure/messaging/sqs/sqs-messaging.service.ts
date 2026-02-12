import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { IMessagingGateway } from "@core/interfaces/messaging-gateway.interface";

@Injectable()
export class SqsMessagingService implements IMessagingGateway {
  private readonly sqsClient: SQSClient;
  private readonly logger = new Logger(SqsMessagingService.name);

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>("AWS_REGION") || "us-east-1";
    const endpoint = this.configService.get<string>("AWS_ENDPOINT");

    this.logger.log(
      `Inicializando SQS Client | Region: ${region} | Endpoint: ${endpoint}`,
    );

    this.sqsClient = new SQSClient({
      region,
      endpoint,
      credentials: {
        accessKeyId:
          this.configService.get<string>("AWS_ACCESS_KEY_ID") || "test",
        secretAccessKey:
          this.configService.get<string>("AWS_SECRET_ACCESS_KEY") || "test",
      },
    });
  }

  async sendMessage(queueUrl: string, payload: any): Promise<void> {
    this.logger.log(`Enviando mensagem para fila: ${queueUrl}`);

    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(payload),
    });

    try {
      const result = await this.sqsClient.send(command);
      this.logger.debug(
        `Mensagem enviada com sucesso! MessageId: ${result.MessageId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao enviar mensagem SQS: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
