import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";

@Injectable()
export class UserIdHeaderGuard implements CanActivate {
  private readonly logger = new Logger(UserIdHeaderGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const userId = request.headers["x-user-id"];

    if (!userId) {
      this.logger.error("Tentativa de acesso sem header x-user-id");
      throw new UnauthorizedException(
        "Usuário não identificado (x-user-id ausente)",
      );
    }

    return true;
  }
}
