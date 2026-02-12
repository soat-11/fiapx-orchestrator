import { Test, TestingModule } from "@nestjs/testing";
import { InternalServerErrorException, Logger } from "@nestjs/common";
import { VideosController } from "./videos.controller";
import { CreateVideoUploadUseCase } from "@core/use-cases/create-video-upload.use-case";
import { ListUserVideosUseCase } from "@core/use-cases/list-user-videos.use-case";
import { Result } from "@shared/result";
import { UserIdHeaderGuard } from "../../auth/user-id.guard";

describe("VideosController", () => {
  let controller: VideosController;
  let createUseCase: CreateVideoUploadUseCase;
  let listUseCase: ListUserVideosUseCase;

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VideosController],
      providers: [
        {
          provide: CreateVideoUploadUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ListUserVideosUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    })
      .overrideGuard(UserIdHeaderGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<VideosController>(VideosController);
    createUseCase = module.get<CreateVideoUploadUseCase>(
      CreateVideoUploadUseCase,
    );
    listUseCase = module.get<ListUserVideosUseCase>(ListUserVideosUseCase);
  });

  it("should create a video successfully", async () => {
    const dto = { fileName: "test.mp4" };
    const user = { userId: "user-1" };
    const expectedOutput = {
      videoId: "123",
      uploadUrl: "http://url",
      status: "PENDING",
    };

    jest
      .spyOn(createUseCase, "execute")
      .mockResolvedValue(Result.ok(expectedOutput));

    const result = await controller.create(dto, user);

    expect(result).toEqual(expectedOutput);
    expect(createUseCase.execute).toHaveBeenCalledWith({
      fileName: dto.fileName,
      userId: user.userId,
    });
  });

  it("should throw error when create fails", async () => {
    const dto = { fileName: "test.mp4" };
    const user = { userId: "user-1" };

    jest
      .spyOn(createUseCase, "execute")
      .mockResolvedValue(Result.fail("Error"));

    await expect(controller.create(dto, user)).rejects.toThrow(
      InternalServerErrorException,
    );
  });

  it("should list videos successfully", async () => {
    const user = { userId: "user-1" };
    const expectedOutput = [
      {
        videoId: "1",
        fileName: "v.mp4",
        status: "DONE",
        createdAt: new Date(),
      },
    ];

    jest
      .spyOn(listUseCase, "execute")
      .mockResolvedValue(Result.ok(expectedOutput));

    const result = await controller.list(user);

    expect(result).toEqual(expectedOutput);
    expect(listUseCase.execute).toHaveBeenCalledWith(user.userId);
  });

  it("should throw error when list fails", async () => {
    const user = { userId: "user-1" };

    jest.spyOn(listUseCase, "execute").mockResolvedValue(Result.fail("Error"));

    await expect(controller.list(user)).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
