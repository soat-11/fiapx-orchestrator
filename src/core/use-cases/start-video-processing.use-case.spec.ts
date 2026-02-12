import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { StartVideoProcessingUseCase } from "./start-video-processing.use-case";
import { IVideoRepository } from "../repositories/video-repository.interface";
import { IMessagingGateway } from "../interfaces/messaging-gateway.interface";
import { Video } from "../domain/entities/video.entity";

describe("StartVideoProcessingUseCase", () => {
  let useCase: StartVideoProcessingUseCase;
  let videoRepo: IVideoRepository;
  let messagingGateway: IMessagingGateway;

  const mockVideo = new Video({
    fileName: "test.mp4",
    userId: "user-1",
    s3KeyRaw: "raw/test.mp4",
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StartVideoProcessingUseCase,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue("http://sqs.fake/processing"),
            get: jest.fn().mockReturnValue("bucket-raw"),
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

    useCase = module.get<StartVideoProcessingUseCase>(
      StartVideoProcessingUseCase,
    );
    videoRepo = module.get<IVideoRepository>("IVideoRepository");
    messagingGateway = module.get<IMessagingGateway>("IMessagingGateway");
  });

  it("deve iniciar processamento e enviar mensagem para fila", async () => {
    jest.spyOn(videoRepo, "findById").mockResolvedValue(mockVideo);

    const result = await useCase.execute("video-123");

    expect(result.isSuccess).toBe(true);
    expect(mockVideo.status).toBe("PROCESSING");
    expect(videoRepo.update).toHaveBeenCalledWith(mockVideo);

    expect(messagingGateway.sendMessage).toHaveBeenCalledWith(
      "http://sqs.fake/processing",
      {
        videoId: mockVideo.id,
        inputBucket: "bucket-raw",
        inputKey: "raw/test.mp4",
      },
    );
  });

  it("deve falhar se vídeo não encontrado", async () => {
    jest.spyOn(videoRepo, "findById").mockResolvedValue(null);

    const result = await useCase.execute("999");

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe("Vídeo não encontrado.");
  });
});
