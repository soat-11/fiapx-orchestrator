import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { UploadEventsListener } from "./upload-events.listener";
import { StartVideoProcessingUseCase } from "@core/use-cases/start-video-processing.use-case";
import { SQSClient, DeleteMessageCommand } from "@aws-sdk/client-sqs";

jest.mock("@aws-sdk/client-sqs");

describe("UploadEventsListener", () => {
  let listener: UploadEventsListener;
  let startUseCase: StartVideoProcessingUseCase;
  let mockSqsClient: any;

  beforeEach(async () => {
    mockSqsClient = {
      send: jest.fn(),
    };
    (SQSClient as jest.Mock).mockImplementation(() => mockSqsClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadEventsListener,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue("queue-url"),
            get: jest.fn().mockReturnValue("region"),
          },
        },
        {
          provide: StartVideoProcessingUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    listener = module.get<UploadEventsListener>(UploadEventsListener);
    startUseCase = module.get<StartVideoProcessingUseCase>(
      StartVideoProcessingUseCase,
    );
  });

  it("should process valid message and call startUseCase", async () => {
    const s3Key = "raw/12345678-1234-1234-1234-123456789012-video.mp4";
    const message = {
      Body: JSON.stringify({
        Records: [{ s3: { object: { key: s3Key } } }],
      }),
      ReceiptHandle: "handle",
    };

    await (listener as any).handleMessage(message);

    expect(startUseCase.execute).toHaveBeenCalledWith(
      "12345678-1234-1234-1234-123456789012",
    );
    expect(mockSqsClient.send).toHaveBeenCalledWith(
      expect.any(DeleteMessageCommand),
    );
  });

  it("should return early if Records are missing", async () => {
    const message = {
      Body: JSON.stringify({ otherField: "value" }),
      ReceiptHandle: "handle",
    };

    await (listener as any).handleMessage(message);

    expect(startUseCase.execute).not.toHaveBeenCalled();
    expect(mockSqsClient.send).not.toHaveBeenCalled();
  });

  it("should ignore invalid key pattern", async () => {
    const s3Key = "wrong-folder/video.mp4";
    const message = {
      Body: JSON.stringify({
        Records: [{ s3: { object: { key: s3Key } } }],
      }),
      ReceiptHandle: "handle",
    };

    await (listener as any).handleMessage(message);

    expect(startUseCase.execute).not.toHaveBeenCalled();
    expect(mockSqsClient.send).toHaveBeenCalledWith(
      expect.any(DeleteMessageCommand),
    );
  });

  it("should delete message on permanent error (Not Found)", async () => {
    const s3Key = "raw/12345678-1234-1234-1234-123456789012-video.mp4";
    const message = {
      Body: JSON.stringify({
        Records: [{ s3: { object: { key: s3Key } } }],
      }),
      ReceiptHandle: "handle",
    };

    jest
      .spyOn(startUseCase, "execute")
      .mockRejectedValue(new Error("Vídeo não encontrado"));

    await (listener as any).handleMessage(message);

    // Deve deletar para não entrar em loop infinito
    expect(mockSqsClient.send).toHaveBeenCalledWith(
      expect.any(DeleteMessageCommand),
    );
  });

  it("should NOT delete message on transient error", async () => {
    const s3Key = "raw/12345678-1234-1234-1234-123456789012-video.mp4";
    const message = {
      Body: JSON.stringify({
        Records: [{ s3: { object: { key: s3Key } } }],
      }),
      ReceiptHandle: "handle",
    };

    jest
      .spyOn(startUseCase, "execute")
      .mockRejectedValue(new Error("Database connection failed"));

    await (listener as any).handleMessage(message);

    // NÃO deve deletar a mensagem (permitindo retry do SQS)
    expect(mockSqsClient.send).not.toHaveBeenCalled();
  });
});
