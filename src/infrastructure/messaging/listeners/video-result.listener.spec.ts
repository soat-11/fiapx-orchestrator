import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { VideoResultListener } from "./video-result.listener";
import { FinishVideoProcessingUseCase } from "@core/use-cases/finish-video-processing.use-case";
import { SQSClient, DeleteMessageCommand } from "@aws-sdk/client-sqs";

jest.mock("@aws-sdk/client-sqs");

describe("VideoResultListener", () => {
  let listener: VideoResultListener;
  let finishUseCase: FinishVideoProcessingUseCase;
  let mockSqsClient: any;

  beforeEach(async () => {
    mockSqsClient = {
      send: jest.fn(),
    };
    (SQSClient as jest.Mock).mockImplementation(() => mockSqsClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoResultListener,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue("queue-url"),
            get: jest.fn().mockReturnValue("region"),
          },
        },
        {
          provide: FinishVideoProcessingUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    listener = module.get<VideoResultListener>(VideoResultListener);
    finishUseCase = module.get<FinishVideoProcessingUseCase>(
      FinishVideoProcessingUseCase,
    );
  });

  it("should handle DONE status correctly", async () => {
    const body = {
      videoId: "123",
      status: "DONE",
      outputKey: "zips/123.zip",
    };
    const message = {
      Body: JSON.stringify(body),
      ReceiptHandle: "handle",
    };

    await (listener as any).handleMessage(message);

    expect(finishUseCase.execute).toHaveBeenCalledWith({
      videoId: "123",
      success: true,
      zipKey: "zips/123.zip",
      errorMessage: undefined,
    });
    expect(mockSqsClient.send).toHaveBeenCalledWith(
      expect.any(DeleteMessageCommand),
    );
  });

  it("should handle ERROR status correctly", async () => {
    const body = {
      videoId: "123",
      status: "ERROR",
      errorMessage: "Failed",
    };
    const message = {
      Body: JSON.stringify(body),
      ReceiptHandle: "handle",
    };

    await (listener as any).handleMessage(message);

    expect(finishUseCase.execute).toHaveBeenCalledWith({
      videoId: "123",
      success: false,
      zipKey: undefined,
      errorMessage: "Failed",
    });
  });

  it("should discard invalid JSON messages", async () => {
    const message = {
      Body: "invalid-json",
      ReceiptHandle: "handle",
    };

    await (listener as any).handleMessage(message);

    expect(finishUseCase.execute).not.toHaveBeenCalled();
    expect(mockSqsClient.send).toHaveBeenCalledWith(
      expect.any(DeleteMessageCommand),
    );
  });

  it("should discard messages without videoId or status", async () => {
    const message = {
      Body: JSON.stringify({ foo: "bar" }),
      ReceiptHandle: "handle",
    };

    await (listener as any).handleMessage(message);

    expect(finishUseCase.execute).not.toHaveBeenCalled();
    expect(mockSqsClient.send).toHaveBeenCalledWith(
      expect.any(DeleteMessageCommand),
    );
  });

  it("should discard DONE status without outputKey", async () => {
    const message = {
      Body: JSON.stringify({ videoId: "123", status: "DONE" }),
      ReceiptHandle: "handle",
    };

    await (listener as any).handleMessage(message);

    expect(finishUseCase.execute).not.toHaveBeenCalled();
    expect(mockSqsClient.send).toHaveBeenCalledWith(
      expect.any(DeleteMessageCommand),
    );
  });

  it("should use default error message if none provided", async () => {
    const message = {
      Body: JSON.stringify({ videoId: "123", status: "ERROR" }),
      ReceiptHandle: "handle",
    };

    await (listener as any).handleMessage(message);

    expect(finishUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        errorMessage:
          "Erro desconhecido no processamento (Worker não enviou motivo).",
      }),
    );
    expect(mockSqsClient.send).toHaveBeenCalledWith(
      expect.any(DeleteMessageCommand),
    );
  });

  it("should delete message if use case throws 'não encontrado'", async () => {
    const message = {
      Body: JSON.stringify({ videoId: "999", status: "DONE", outputKey: "k" }),
      ReceiptHandle: "handle",
    };

    jest
      .spyOn(finishUseCase, "execute")
      .mockRejectedValue(new Error("Vídeo não encontrado"));

    await (listener as any).handleMessage(message);

    // Deve deletar a mensagem
    expect(mockSqsClient.send).toHaveBeenCalledWith(
      expect.any(DeleteMessageCommand),
    );
  });

  it("should NOT delete message if use case throws transient error", async () => {
    const message = {
      Body: JSON.stringify({ videoId: "123", status: "DONE", outputKey: "k" }),
      ReceiptHandle: "handle",
    };

    jest
      .spyOn(finishUseCase, "execute")
      .mockRejectedValue(new Error("DB Connection Failed"));

    await (listener as any).handleMessage(message);

    // NÃO deve deletar a mensagem
    expect(mockSqsClient.send).not.toHaveBeenCalled();
  });
});
