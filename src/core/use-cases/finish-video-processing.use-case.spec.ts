import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { FinishVideoProcessingUseCase } from "./finish-video-processing.use-case";
import { IVideoRepository } from "../repositories/video-repository.interface";
import { IMessagingGateway } from "../interfaces/messaging-gateway.interface";
import { Video } from "../domain/entities/video.entity";
import { Logger } from "@nestjs/common";

describe("FinishVideoProcessingUseCase", () => {
  let useCase: FinishVideoProcessingUseCase;
  let videoRepo: IVideoRepository;
  let messagingGateway: IMessagingGateway;

  const mockVideo = new Video({
    fileName: "test.mp4",
    userId: "user-1",
    s3KeyRaw: "raw/test.mp4",
  });

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinishVideoProcessingUseCase,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest
              .fn()
              .mockReturnValue("http://sqs.fake/email-queue"),
          },
        },
        {
          provide: "IVideoRepository",
          useValue: {
            findById: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: "IMessagingGateway",
          useValue: {
            sendMessage: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get<FinishVideoProcessingUseCase>(
      FinishVideoProcessingUseCase,
    );
    videoRepo = module.get<IVideoRepository>("IVideoRepository");
    messagingGateway = module.get<IMessagingGateway>("IMessagingGateway");
  });

  it("deve finalizar com SUCESSO e enviar email", async () => {
    const input = { videoId: "123", success: true, zipKey: "zips/video.zip" };
    jest.spyOn(videoRepo, "findById").mockResolvedValue(mockVideo);

    const result = await useCase.execute(input);

    expect(result.isSuccess).toBe(true);
    expect(videoRepo.update).toHaveBeenCalled();
    expect(mockVideo.status).toBe("DONE");
    expect(messagingGateway.sendMessage).toHaveBeenCalledWith(
      "http://sqs.fake/email-queue",
      expect.objectContaining({
        status: "DONE",
        downloadLink: "zips/video.zip",
      }),
    );
  });

  it("deve finalizar com ERRO e enviar email", async () => {
    const input = {
      videoId: "123",
      success: false,
      errorMessage: "Falha ffmpeg",
    };
    jest.spyOn(videoRepo, "findById").mockResolvedValue(mockVideo);

    const result = await useCase.execute(input);

    expect(result.isSuccess).toBe(true);
    expect(mockVideo.status).toBe("ERROR");
    expect(messagingGateway.sendMessage).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        status: "ERROR",
        message: "Houve um erro no processamento.",
      }),
    );
  });

  it("deve retornar Result.fail se o vídeo não for encontrado", async () => {
    jest.spyOn(videoRepo, "findById").mockResolvedValue(null);

    const result = await useCase.execute({ videoId: "999", success: true });

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain("não encontrado");
  });
});
