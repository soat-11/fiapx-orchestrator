import { Test, TestingModule } from "@nestjs/testing";
import { ListUserVideosUseCase } from "./list-user-videos.use-case";
import { IVideoRepository } from "../repositories/video-repository.interface";
import { Video } from "../domain/entities/video.entity";

describe("ListUserVideosUseCase", () => {
  let useCase: ListUserVideosUseCase;
  let videoRepo: IVideoRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListUserVideosUseCase,
        {
          provide: "IVideoRepository",
          useValue: {
            findAllByUserId: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get<ListUserVideosUseCase>(ListUserVideosUseCase);
    videoRepo = module.get<IVideoRepository>("IVideoRepository");
  });

  it("deve retornar lista de vídeos mapeada corretamente", async () => {
    const mockVideos = [
      new Video({ fileName: "v1.mp4", userId: "u1", s3KeyRaw: "raw/1" }),
      new Video({ fileName: "v2.mp4", userId: "u1", s3KeyRaw: "raw/2" }),
    ];

    mockVideos[1].complete("zips/v2.zip");

    jest.spyOn(videoRepo, "findAllByUserId").mockResolvedValue(mockVideos);

    const result = await useCase.execute("u1");

    expect(result.isSuccess).toBe(true);
    const output = result.getValue();
    expect(output).toHaveLength(2);
    expect(output[0].fileName).toBe("v1.mp4");
    expect(output[0].downloadUrl).toBeNull();

    expect(output[1].fileName).toBe("v2.mp4");
    expect(output[1].downloadUrl).toBe("zips/v2.zip");
    expect(output[1].status).toBe("DONE");
  });

  it("deve retornar Result.fail caso o repositório lance erro", async () => {
    jest
      .spyOn(videoRepo, "findAllByUserId")
      .mockRejectedValue(new Error("DB Error"));

    const result = await useCase.execute("u1");

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe("DB Error");
  });
});
