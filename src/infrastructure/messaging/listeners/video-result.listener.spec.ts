import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { VideoResultListener } from "./video-result.listener";
import { FinishVideoProcessingUseCase } from "@core/use-cases/finish-video-processing.use-case";
import { SQSClient } from "@aws-sdk/client-sqs";
import { Logger } from "@nestjs/common";

jest.mock("@aws-sdk/client-sqs");

describe("VideoResultListener", () => {
  let listener: VideoResultListener;
  let finishUseCase: FinishVideoProcessingUseCase;

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => {});

    (SQSClient as jest.Mock).mockImplementation(() => ({}));

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

  it("should process DONE status", async () => {
    const message = {
      Body: JSON.stringify({
        videoId: "123",
        status: "DONE",
        outputKey: "zip/123.zip",
      }),
    } as any;

    await listener.handleMessage(message);

    expect(finishUseCase.execute).toHaveBeenCalledWith({
      videoId: "123",
      success: true,
      zipKey: "zip/123.zip",
      errorMessage: undefined,
    });
  });

  it("should process ERROR status", async () => {
    const message = {
      Body: JSON.stringify({
        videoId: "123",
        status: "ERROR",
        errorMessage: "failed",
      }),
    } as any;

    await listener.handleMessage(message);

    expect(finishUseCase.execute).toHaveBeenCalledWith({
      videoId: "123",
      success: false,
      zipKey: undefined,
      errorMessage: "failed",
    });
  });

  it("should return silently on invalid JSON", async () => {
    const message = { Body: "invalid-json" } as any;

    await expect(listener.handleMessage(message)).resolves.not.toThrow();
    expect(finishUseCase.execute).not.toHaveBeenCalled();
  });

  it("should return silently if DONE but missing outputKey", async () => {
    const message = {
      Body: JSON.stringify({ videoId: "123", status: "DONE" }),
    } as any;

    await expect(listener.handleMessage(message)).resolves.not.toThrow();
    expect(finishUseCase.execute).not.toHaveBeenCalled();
  });

  it("should throw on transient error", async () => {
    const message = {
      Body: JSON.stringify({
        videoId: "123",
        status: "DONE",
        outputKey: "zip/123.zip",
      }),
    } as any;

    jest
      .spyOn(finishUseCase, "execute")
      .mockRejectedValue(new Error("DB error"));

    await expect(listener.handleMessage(message)).rejects.toThrow("DB error");
  });
});
