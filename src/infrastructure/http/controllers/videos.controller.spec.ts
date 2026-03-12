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

  // Função auxiliar para gerar um Token JWT falso com um e-mail específico
  const generateMockAuthHeader = (email: string) => {
    const payload = { email };
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString(
      "base64",
    );
    return `Bearer header.${base64Payload}.signature`;
  };

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => {});

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

  it("should create a video successfully and extract email from token", async () => {
    const dto = { fileName: "test.mp4" };
    const user = { userId: "user-1" };
    const mockEmail = "avaliador@fiap.com.br";
    const mockAuthHeader = generateMockAuthHeader(mockEmail);

    const expectedOutput = {
      videoId: "123",
      uploadUrl: "http://url",
      status: "PENDING",
    };

    jest
      .spyOn(createUseCase, "execute")
      .mockResolvedValue(Result.ok(expectedOutput));

    // Passamos o mockAuthHeader como terceiro parâmetro
    const result = await controller.create(dto, user, mockAuthHeader);

    expect(result).toEqual(expectedOutput);
    // Verificamos se o Controller mandou o e-mail certinho para o UseCase!
    expect(createUseCase.execute).toHaveBeenCalledWith({
      fileName: dto.fileName,
      userId: user.userId,
      userEmail: mockEmail,
    });
  });

  it("should create a video with fallback email if token is invalid", async () => {
    const dto = { fileName: "test.mp4" };
    const user = { userId: "user-1" };
    const invalidAuthHeader = "Bearer token_invalido_sem_pontos";

    const expectedOutput = {
      videoId: "123",
      uploadUrl: "http://url",
      status: "PENDING",
    };

    jest
      .spyOn(createUseCase, "execute")
      .mockResolvedValue(Result.ok(expectedOutput));

    const result = await controller.create(dto, user, invalidAuthHeader);

    expect(result).toEqual(expectedOutput);
    // Verifica se usou o fallback já que o token estava quebrado
    expect(createUseCase.execute).toHaveBeenCalledWith({
      fileName: dto.fileName,
      userId: user.userId,
      userEmail: "email_nao_identificado",
    });
  });

  it("should throw error when create fails", async () => {
    const dto = { fileName: "test.mp4" };
    const user = { userId: "user-1" };
    const mockAuthHeader = generateMockAuthHeader("teste@fiap.com.br");

    jest
      .spyOn(createUseCase, "execute")
      .mockResolvedValue(Result.fail("Error"));

    await expect(controller.create(dto, user, mockAuthHeader)).rejects.toThrow(
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
