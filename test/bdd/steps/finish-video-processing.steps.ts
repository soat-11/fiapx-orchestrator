import { loadFeature, defineFeature } from "jest-cucumber";
import { FinishVideoProcessingUseCase } from "@core/use-cases/finish-video-processing.use-case";
import { Video } from "@core/domain/entities/video.entity";
import { Result } from "@shared/result";
import { Logger } from "@nestjs/common";

const feature = loadFeature(
  "test/bdd/features/finish-video-processing.feature",
);

defineFeature(feature, (test) => {
  let useCase: FinishVideoProcessingUseCase;
  let mockVideoRepo: any;
  let mockMessagingGateway: any;
  let mockConfigService: any;
  let input: any;
  let result: Result<void>;
  let mockVideo: Video;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => {});

    mockVideoRepo = { findById: jest.fn(), update: jest.fn() };
    mockMessagingGateway = { sendMessage: jest.fn() };
    mockConfigService = {
      getOrThrow: jest.fn().mockReturnValue("email-queue-url"),
    };

    useCase = new FinishVideoProcessingUseCase(
      mockVideoRepo,
      mockMessagingGateway,
      mockConfigService,
    );
  });

  test("Processing finished successfully", ({ given, when, then, and }) => {
    given(/^an existing video in processing state with ID "(.*)"$/, (id) => {
      mockVideo = new Video({
        fileName: "test.mp4",
        userId: "u1",
        s3KeyRaw: "key",
      });
      Object.assign(mockVideo, { id });
      mockVideoRepo.findById.mockResolvedValue(mockVideo);
    });

    when(
      /^the finish process is executed with success and a ZIP key "(.*)"$/,
      async (zipKey) => {
        input = { videoId: mockVideo.id, success: true, zipKey };
        result = await useCase.execute(input);
      },
    );

    then("the video status should be updated to DONE", () => {
      expect(result.isSuccess).toBe(true);
      expect(mockVideo.status).toBe("DONE");
      expect(mockVideoRepo.update).toHaveBeenCalledWith(mockVideo);
    });

    and("an email notification message should be queued", () => {
      expect(mockMessagingGateway.sendMessage).toHaveBeenCalledWith(
        "email-queue-url",
        expect.objectContaining({ status: "DONE" }),
      );
    });
  });

  test("Processing failed", ({ given, when, then, and }) => {
    given(/^an existing video in processing state with ID "(.*)"$/, (id) => {
      mockVideo = new Video({
        fileName: "test.mp4",
        userId: "u1",
        s3KeyRaw: "key",
      });
      Object.assign(mockVideo, { id });
      mockVideoRepo.findById.mockResolvedValue(mockVideo);
    });

    when(
      "the finish process is executed with failure and an error message",
      async () => {
        input = {
          videoId: mockVideo.id,
          success: false,
          errorMessage: "Error",
        };
        result = await useCase.execute(input);
      },
    );

    then("the video status should be updated to ERROR", () => {
      expect(result.isSuccess).toBe(true);
      expect(mockVideo.status).toBe("ERROR");
      expect(mockVideoRepo.update).toHaveBeenCalledWith(mockVideo);
    });

    and("an email notification message should be queued", () => {
      expect(mockMessagingGateway.sendMessage).toHaveBeenCalledWith(
        "email-queue-url",
        expect.objectContaining({ status: "ERROR" }),
      );
    });
  });
});
