export abstract class IMessagingGateway {
  abstract sendMessage(queueUrl: string, payload: any): Promise<void>;
}
