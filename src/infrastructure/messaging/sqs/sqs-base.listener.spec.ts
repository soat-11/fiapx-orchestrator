import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";
import { SqsBaseListener } from "./sqs-base.listener";
import { Logger } from "@nestjs/common";

jest.mock("@aws-sdk/client-sqs");

class TestableListener extends SqsBaseListener {
  async handleMessage(message: any): Promise<void> {
    if (message.Body === "fail") {
      throw new Error("Processing failed");
    }
  }
}

describe("SqsBaseListener", () => {
  let listener: TestableListener;
  let mockSqsClient: any;

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "debug").mockImplementation(() => {});

    mockSqsClient = {
      send: jest.fn(),
    };
    (SQSClient as jest.Mock).mockImplementation(() => mockSqsClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue("queue-url"),
            get: jest.fn().mockReturnValue("region"),
          },
        },
      ],
    }).compile();

    const config = module.get<ConfigService>(ConfigService);
    listener = new TestableListener(config, "TestContext", "KEY");
  });

  it("should process and delete message on success", async () => {
    const message = {
      Body: "success",
      ReceiptHandle: "handle-1",
    };

    mockSqsClient.send
      .mockResolvedValueOnce({ Messages: [message] })
      .mockImplementation(() => new Promise(() => {}));

    listener.listen();

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockSqsClient.send).toHaveBeenCalledWith(
      expect.any(ReceiveMessageCommand),
    );
    expect(mockSqsClient.send).toHaveBeenCalledWith(
      expect.any(DeleteMessageCommand),
    );
  });

  it("should NOT delete message on failure", async () => {
    const message = {
      Body: "fail",
      ReceiptHandle: "handle-2",
    };

    mockSqsClient.send
      .mockResolvedValueOnce({ Messages: [message] })
      .mockImplementation(() => new Promise(() => {}));

    listener.listen();

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockSqsClient.send).toHaveBeenCalledWith(
      expect.any(ReceiveMessageCommand),
    );
    expect(mockSqsClient.send).not.toHaveBeenCalledWith(
      expect.any(DeleteMessageCommand),
    );
  });
});
