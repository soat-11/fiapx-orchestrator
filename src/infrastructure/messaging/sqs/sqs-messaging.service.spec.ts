import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { SqsMessagingService } from "./sqs-messaging.service";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { Logger } from "@nestjs/common";

jest.mock("@aws-sdk/client-sqs");

describe("SqsMessagingService", () => {
  let service: SqsMessagingService;
  let mockSqsClient: any;

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "debug").mockImplementation(() => {});

    mockSqsClient = {
      send: jest.fn().mockResolvedValue({ MessageId: "msg-id" }),
    };

    (SQSClient as jest.Mock).mockImplementation(() => mockSqsClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SqsMessagingService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue("us-east-1"),
          },
        },
      ],
    }).compile();

    service = module.get<SqsMessagingService>(SqsMessagingService);
    jest.clearAllMocks();
  });

  it("should send message to SQS", async () => {
    const queueUrl = "http://queue";
    const payload = { data: "test" };

    await service.sendMessage(queueUrl, payload);

    expect(SendMessageCommand).toHaveBeenCalledTimes(1);
    expect(SendMessageCommand).toHaveBeenCalledWith({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(payload),
    });

    expect(mockSqsClient.send).toHaveBeenCalledTimes(1);
  });

  it("should throw error if send fails", async () => {
    mockSqsClient.send.mockRejectedValue(new Error("SQS Error"));

    await expect(service.sendMessage("http://queue", {})).rejects.toThrow(
      "SQS Error",
    );
  });
});
