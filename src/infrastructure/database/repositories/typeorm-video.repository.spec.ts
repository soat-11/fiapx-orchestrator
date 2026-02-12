import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmVideoRepository } from "./typeorm-video.repository";
import { TypeOrmVideo } from "../typeorm/entities/video.orm-entity";
import { Video } from "@core/domain/entities/video.entity";
import { VideoStatus } from "@core/domain/enums/video-status.enum";

describe("TypeOrmVideoRepository", () => {
  let repository: TypeOrmVideoRepository;
  let typeOrmRepo: Repository<TypeOrmVideo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TypeOrmVideoRepository,
        {
          provide: getRepositoryToken(TypeOrmVideo),
          useValue: {
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get<TypeOrmVideoRepository>(TypeOrmVideoRepository);
    typeOrmRepo = module.get<Repository<TypeOrmVideo>>(
      getRepositoryToken(TypeOrmVideo),
    );
  });

  it("should create and save a video", async () => {
    const video = new Video({
      fileName: "test.mp4",
      userId: "user-1",
      s3KeyRaw: "raw/test.mp4",
    });

    jest.spyOn(typeOrmRepo, "save").mockResolvedValue(undefined);

    await repository.create(video);

    expect(typeOrmRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: video.id,
        fileName: video.fileName,
      }),
    );
  });

  it("should find a video by id", async () => {
    const mockEntity = new TypeOrmVideo();
    mockEntity.id = "123";
    mockEntity.fileName = "test.mp4";
    mockEntity.userId = "user-1";
    mockEntity.status = VideoStatus.PENDING;
    mockEntity.createdAt = new Date();

    jest.spyOn(typeOrmRepo, "findOne").mockResolvedValue(mockEntity);

    const result = await repository.findById("123");

    expect(result).toBeDefined();
    expect(result.id).toBe("123");
    expect(typeOrmRepo.findOne).toHaveBeenCalledWith({ where: { id: "123" } });
  });

  it("should return null if video not found", async () => {
    jest.spyOn(typeOrmRepo, "findOne").mockResolvedValue(null);

    const result = await repository.findById("999");

    expect(result).toBeNull();
  });

  it("should update a video", async () => {
    const video = new Video({
      id: "123",
      fileName: "test.mp4",
      userId: "user-1",
      s3KeyRaw: "raw/key",
    });

    jest.spyOn(typeOrmRepo, "save").mockResolvedValue(undefined);

    await repository.update(video);

    expect(typeOrmRepo.save).toHaveBeenCalled();
  });

  it("should find all videos by userId", async () => {
    const mockEntity = new TypeOrmVideo();
    mockEntity.id = "123";
    mockEntity.userId = "user-1";
    mockEntity.createdAt = new Date();

    jest.spyOn(typeOrmRepo, "find").mockResolvedValue([mockEntity]);

    const result = await repository.findAllByUserId("user-1");

    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe("user-1");
    expect(typeOrmRepo.find).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      order: { createdAt: "DESC" },
    });
  });
});
