import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException, ExecutionContext } from "@nestjs/common";
import { UserIdHeaderGuard } from "./user-id.guard";

describe("UserIdHeaderGuard", () => {
  let guard: UserIdHeaderGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserIdHeaderGuard],
    }).compile();

    guard = module.get<UserIdHeaderGuard>(UserIdHeaderGuard);
  });

  it("should allow access when x-user-id header is present", () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            "x-user-id": "user-123",
          },
        }),
      }),
    } as unknown as ExecutionContext;

    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it("should throw UnauthorizedException when x-user-id is missing", () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {},
        }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it("should throw UnauthorizedException when x-user-id is undefined", () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            "x-user-id": undefined,
          },
        }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
