import { OnModuleInit, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  Message,
} from "@aws-sdk/client-sqs";

export abstract class SqsBaseListener implements OnModuleInit {
  protected readonly logger: Logger;
  protected readonly sqsClient: SQSClient;
  protected readonly queueUrl: string;

  constructor(
    protected readonly configService: ConfigService,
    contextName: string,
    queueUrlEnvKey: string,
  ) {
    this.logger = new Logger(contextName);
    this.queueUrl = this.configService.getOrThrow<string>(queueUrlEnvKey);

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

  // Método abstrato que as classes filhas DEVEM implementar
  abstract handleMessage(message: Message): Promise<void>;

  onModuleInit() {
    this.logger.log(`🎧 Ouvindo fila: ${this.queueUrl}`);
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
            try {
              await this.handleMessage(message);
              await this.deleteMessage(message);
            } catch (error) {
              this.logger.error(
                `Erro no processamento da mensagem: ${error.message}`,
              );
            }
          }
        }
      } catch (error) {
        this.logger.error(`Erro de conexão SQS: ${error.message}`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  protected async deleteMessage(message: Message) {
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
