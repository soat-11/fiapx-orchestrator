import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { S3StorageService } from "./s3-storage.service";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Logger } from "@nestjs/common";

jest.mock("@aws-sdk/client-s3");
jest.mock("@aws-sdk/s3-request-presigner");

describe("S3StorageService", () => {
  let service: S3StorageService;

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "debug").mockImplementation(() => {});

    (S3Client as jest.Mock).mockImplementation(() => ({}));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3StorageService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              if (key === "AWS_REGION") return "us-east-1";
              if (key === "AWS_S3_BUCKET_RAW") return "test-bucket";
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<S3StorageService>(S3StorageService);
    jest.clearAllMocks();
  });

  it("should generate a presigned url and file key", async () => {
    const fileName = "my video.mp4";
    const videoId = "123";
    const expectedUrl = "http://presigned.url";
    const expectedKey = "raw/123-my_video.mp4";

    (getSignedUrl as jest.Mock).mockResolvedValue(expectedUrl);

    const result = await service.generatePresignedUrl(fileName, videoId);

    expect(result).toEqual({
      url: expectedUrl,
      fileKey: expectedKey,
    });

    expect(PutObjectCommand).toHaveBeenCalledWith({
      Bucket: "test-bucket",
      Key: expectedKey,
      ContentType: "video/mp4",
    });

    expect(getSignedUrl).toHaveBeenCalled();
  });

  it("should throw error if getSignedUrl fails", async () => {
    (getSignedUrl as jest.Mock).mockRejectedValue(new Error("AWS Error"));

    await expect(
      service.generatePresignedUrl("test.mp4", "123"),
    ).rejects.toThrow("AWS Error");
  });
});
