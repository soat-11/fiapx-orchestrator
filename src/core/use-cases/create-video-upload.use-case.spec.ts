import { Test, TestingModule } from "@nestjs/testing";
import { CreateVideoUploadUseCase } from "./create-video-upload.use-case";
import { IVideoRepository } from "../repositories/video-repository.interface";
import { IStorageGateway } from "../interfaces/storage-gateway.interface";
import { Result } from "@shared/result";

describe("CreateVideoUploadUseCase", () => {
  let useCase: CreateVideoUploadUseCase;
  let videoRepo: IVideoRepository;
  let storageGateway: IStorageGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateVideoUploadUseCase,
        {
          provide: "IVideoRepository",
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: "IStorageGateway",
          useValue: {
            generatePresignedUrl: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get<CreateVideoUploadUseCase>(CreateVideoUploadUseCase);
    videoRepo = module.get<IVideoRepository>("IVideoRepository");
    storageGateway = module.get<IStorageGateway>("IStorageGateway");
  });

  it("deve criar um vídeo e retornar a URL de upload com sucesso", async () => {
    const input = { fileName: "treino.mp4", userId: "user-123" };
    const mockUrlInfo = {
      url: "http://s3.fake/upload",
      fileKey: "raw/123.mp4",
    };

    jest
      .spyOn(storageGateway, "generatePresignedUrl")
      .mockResolvedValue(mockUrlInfo);
    jest.spyOn(videoRepo, "create").mockResolvedValue(undefined);

    const result = await useCase.execute(input);

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toEqual({
      videoId: expect.any(String),
      uploadUrl: mockUrlInfo.url,
      status: "PENDING",
    });

    expect(storageGateway.generatePresignedUrl).toHaveBeenCalledWith(
      input.fileName,
      expect.any(String),
    );
    expect(videoRepo.create).toHaveBeenCalled();
  });

  it("deve retornar Result.fail se o Storage falhar", async () => {
    jest
      .spyOn(storageGateway, "generatePresignedUrl")
      .mockRejectedValue(new Error("S3 Error"));

    const result = await useCase.execute({
      fileName: "fail.mp4",
      userId: "123",
    });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe("S3 Error");
  });
});
