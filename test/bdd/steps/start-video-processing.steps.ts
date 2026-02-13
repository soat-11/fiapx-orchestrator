import { loadFeature, defineFeature } from "jest-cucumber";
import { StartVideoProcessingUseCase } from "@core/use-cases/start-video-processing.use-case";
import { Video } from "@core/domain/entities/video.entity";
import { Result } from "@shared/result";
import { Logger } from "@nestjs/common";

const feature = loadFeature("test/bdd/features/start-video-processing.feature");

defineFeature(feature, (test) => {
  let useCase: StartVideoProcessingUseCase;
  let mockVideoRepo: any;
  let mockMessagingGateway: any;
  let mockConfigService: any;
  let videoId: string;
  let result: Result<void>;
  let mockVideo: Video;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => {});

    mockVideoRepo = { findById: jest.fn(), update: jest.fn() };
    mockMessagingGateway = { sendMessage: jest.fn() };
    mockConfigService = {
      getOrThrow: jest.fn().mockReturnValue("queue-url"),
      get: jest.fn().mockReturnValue("bucket-name"),
    };

    useCase = new StartVideoProcessingUseCase(
      mockVideoRepo,
      mockMessagingGateway,
      mockConfigService,
    );
  });

  test("Successfully start processing", ({ given, when, then, and }) => {
    given(/^an existing video with ID "(.*)"$/, (id) => {
      videoId = id;
      mockVideo = new Video({
        fileName: "test.mp4",
        userId: "u1",
        s3KeyRaw: "key",
      });
      Object.assign(mockVideo, { id: videoId });
      mockVideoRepo.findById.mockResolvedValue(mockVideo);
    });

    when("the start video processing is executed", async () => {
      result = await useCase.execute(videoId);
    });

    then("the video status should be updated to PROCESSING", () => {
      expect(result.isSuccess).toBe(true);
      expect(mockVideo.status).toBe("PROCESSING");
      expect(mockVideoRepo.update).toHaveBeenCalledWith(mockVideo);
    });

    and("a message should be sent to the processing queue", () => {
      expect(mockMessagingGateway.sendMessage).toHaveBeenCalled();
    });
  });

  test("Video not found", ({ given, when, then }) => {
    given(/^a non-existent video ID "(.*)"$/, (id) => {
      videoId = id;
      mockVideoRepo.findById.mockResolvedValue(null);
    });

    when("the start video processing is executed", async () => {
      result = await useCase.execute(videoId);
    });

    then("the operation should fail indicating the video was not found", () => {
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe("Vídeo não encontrado.");
    });
  });
});
