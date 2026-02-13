import { loadFeature, defineFeature } from "jest-cucumber";
import { CreateVideoUploadUseCase } from "@core/use-cases/create-video-upload.use-case";
import { Result } from "@shared/result";
import { Logger } from "@nestjs/common";

const feature = loadFeature("test/bdd/features/create-video-upload.feature");

defineFeature(feature, (test) => {
  let useCase: CreateVideoUploadUseCase;
  let mockVideoRepo: any;
  let mockStorageGateway: any;
  let input: any;
  let result: Result<any>;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "debug").mockImplementation(() => {});

    mockVideoRepo = { create: jest.fn() };
    mockStorageGateway = { generatePresignedUrl: jest.fn() };

    useCase = new CreateVideoUploadUseCase(mockVideoRepo, mockStorageGateway);
  });

  test("Successfully initiate a video upload", ({ given, when, then, and }) => {
    given(
      /^I have a valid file name "(.*)" and a user ID "(.*)"$/,
      (fileName, userId) => {
        input = { fileName, userId };
        mockStorageGateway.generatePresignedUrl.mockResolvedValue({
          url: "http://presigned.url",
          fileKey: "raw/key.mp4",
        });
        mockVideoRepo.create.mockResolvedValue(undefined);
      },
    );

    when("I request to create a video upload", async () => {
      result = await useCase.execute(input);
    });

    then("a new video should be saved in the database", () => {
      expect(mockVideoRepo.create).toHaveBeenCalled();
    });

    and("a presigned URL should be returned", () => {
      expect(result.isSuccess).toBe(true);
      expect(result.getValue().uploadUrl).toBe("http://presigned.url");
    });
  });

  test("Storage gateway fails to generate URL", ({
    given,
    and,
    when,
    then,
  }) => {
    given(
      /^I have a valid file name "(.*)" and a user ID "(.*)"$/,
      (fileName, userId) => {
        input = { fileName, userId };
      },
    );

    and("the storage gateway is unavailable", () => {
      mockStorageGateway.generatePresignedUrl.mockRejectedValue(
        new Error("S3 Error"),
      );
    });

    when("I request to create a video upload", async () => {
      result = await useCase.execute(input);
    });

    then("the operation should fail with an error message", () => {
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe("S3 Error");
    });
  });
});
