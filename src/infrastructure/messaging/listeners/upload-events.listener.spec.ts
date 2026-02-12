import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { UploadEventsListener } from "./upload-events.listener";
import { StartVideoProcessingUseCase } from "@core/use-cases/start-video-processing.use-case";
import { SQSClient } from "@aws-sdk/client-sqs";
import { Logger } from "@nestjs/common";

jest.mock("@aws-sdk/client-sqs");

describe("UploadEventsListener", () => {
  let listener: UploadEventsListener;
  let startUseCase: StartVideoProcessingUseCase;

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => {});

    (SQSClient as jest.Mock).mockImplementation(() => ({}));

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
    // CORREÇÃO: Recuperar a instância mockada do UseCase
    startUseCase = module.get<StartVideoProcessingUseCase>(
      StartVideoProcessingUseCase,
    );
  });

  it("should call usecase when valid message received", async () => {
    const s3Key = "raw/12345678-1234-1234-1234-123456789012-video.mp4";
    const message = {
      Body: JSON.stringify({
        Records: [{ s3: { object: { key: s3Key } } }],
      }),
    } as any;

    await listener.handleMessage(message);

    expect(startUseCase.execute).toHaveBeenCalledWith(
      "12345678-1234-1234-1234-123456789012",
    );
  });

  it("should return silently if Records are missing", async () => {
    const message = { Body: JSON.stringify({}) } as any;

    await expect(listener.handleMessage(message)).resolves.not.toThrow();
    expect(startUseCase.execute).not.toHaveBeenCalled();
  });

  it("should catch Not Found error and return silently (delete message)", async () => {
    const s3Key = "raw/12345678-1234-1234-1234-123456789012-video.mp4";
    const message = {
      Body: JSON.stringify({
        Records: [{ s3: { object: { key: s3Key } } }],
      }),
    } as any;

    jest
      .spyOn(startUseCase, "execute")
      .mockRejectedValue(new Error("Vídeo não encontrado"));

    await expect(listener.handleMessage(message)).resolves.not.toThrow();
  });

  it("should throw error on transient failure (retry message)", async () => {
    const s3Key = "raw/12345678-1234-1234-1234-123456789012-video.mp4";
    const message = {
      Body: JSON.stringify({
        Records: [{ s3: { object: { key: s3Key } } }],
      }),
    } as any;

    jest
      .spyOn(startUseCase, "execute")
      .mockRejectedValue(new Error("Database error"));

    await expect(listener.handleMessage(message)).rejects.toThrow(
      "Database error",
    );
  });
});
