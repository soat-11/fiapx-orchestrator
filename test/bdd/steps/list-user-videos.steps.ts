import { loadFeature, defineFeature } from "jest-cucumber";
import { ListUserVideosUseCase } from "@core/use-cases/list-user-videos.use-case";
import { Video } from "@core/domain/entities/video.entity";
import { Result } from "@shared/result";

const feature = loadFeature("test/bdd/features/list-user-videos.feature");

defineFeature(feature, (test) => {
  let useCase: ListUserVideosUseCase;
  let mockVideoRepo: any;
  let userId: string;
  let result: Result<any[]>;

  beforeEach(() => {
    mockVideoRepo = { findAllByUserId: jest.fn() };
    useCase = new ListUserVideosUseCase(mockVideoRepo);
  });

  test("Successfully list videos", ({ given, when, then }) => {
    given(
      /^a user with ID "(.*)" who has uploaded (\d+) videos$/,
      (id, count) => {
        userId = id;
        const videos = Array.from({ length: Number(count) }).map(
          (_, i) =>
            new Video({ fileName: `v${i}.mp4`, userId, s3KeyRaw: `key${i}` }),
        );
        mockVideoRepo.findAllByUserId.mockResolvedValue(videos);
      },
    );

    when("the user requests to list their videos", async () => {
      result = await useCase.execute(userId);
    });

    then(
      /^the system should return a mapped list of (\d+) videos$/,
      (count) => {
        expect(result.isSuccess).toBe(true);
        expect(result.getValue()).toHaveLength(Number(count));
      },
    );
  });

  test("Repository throws an error", ({ given, and, when, then }) => {
    given(/^a user with ID "(.*)"$/, (id) => {
      userId = id;
    });

    and("the database is unavailable", () => {
      mockVideoRepo.findAllByUserId.mockRejectedValue(new Error("DB Error"));
    });

    when("the user requests to list their videos", async () => {
      result = await useCase.execute(userId);
    });

    then("the operation should fail with an internal error", () => {
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe("DB Error");
    });
  });
});
