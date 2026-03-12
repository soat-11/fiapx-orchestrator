import {
  Controller,
  Post,
  Get,
  Body,
  Logger,
  HttpCode,
  HttpStatus,
  UseGuards,
  InternalServerErrorException,
  Headers,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from "@nestjs/swagger";
import { CreateVideoUploadUseCase } from "@core/use-cases/create-video-upload.use-case";
import { ListUserVideosUseCase } from "@core/use-cases/list-user-videos.use-case";

import { CreateVideoDto } from "../dtos/create-video.dto";
import { UserIdHeaderGuard } from "../../auth/user-id.guard";
import { CurrentUser } from "../../auth/current-user.decorator";

@ApiTags("Videos")
@Controller("videos")
export class VideosController {
  private readonly logger = new Logger(VideosController.name);

  constructor(
    private readonly createVideoUseCase: CreateVideoUploadUseCase,
    private readonly listUserVideosUseCase: ListUserVideosUseCase,
  ) {}

  @Post()
  @UseGuards(UserIdHeaderGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Inicia upload de vídeo",
    description: "Gera URL assinada. Requer header x-user-id e token Bearer.",
  })
  @ApiHeader({
    name: "x-user-id",
    description: "ID do usuário autenticado (UUID)",
    required: true,
  })
  @ApiResponse({ status: 201, description: "Upload iniciado." })
  @ApiResponse({ status: 401, description: "Não autorizado." })
  async create(
    @Body() createVideoDto: CreateVideoDto,
    @CurrentUser() user: { userId: string },
    @Headers("authorization") authHeader: string,
  ) {
    let userEmail = "email_nao_identificado";

    try {
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        const payloadBase64 = token.split(".")[1];
        const payload = JSON.parse(
          Buffer.from(payloadBase64, "base64").toString("utf8"),
        );
        if (payload.email) {
          userEmail = payload.email;
        }
      }
    } catch (error) {
      this.logger.warn(
        `⚠️ Não foi possível extrair o e-mail do token: ${error.message}`,
      );
    }

    this.logger.log(
      `Recebendo requisição de upload. User: ${user.userId} | Email: ${userEmail} | Arquivo: ${createVideoDto.fileName}`,
    );

    const result = await this.createVideoUseCase.execute({
      fileName: createVideoDto.fileName,
      userId: user.userId,
      userEmail: userEmail,
    });

    if (result.isFailure) {
      this.logger.error(`Falha no UseCase CreateVideo: ${result.error}`);
      throw new InternalServerErrorException(result.error);
    }

    const value = result.getValue();
    this.logger.log(`Requisição processada. Video ID: ${value.videoId}`);

    return value;
  }

  @Get()
  @UseGuards(UserIdHeaderGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Lista vídeos do usuário" })
  @ApiHeader({
    name: "x-user-id",
    description: "ID do usuário autenticado",
    required: true,
  })
  async list(@CurrentUser() user: { userId: string }) {
    const result = await this.listUserVideosUseCase.execute(user.userId);

    if (result.isFailure) {
      this.logger.error(`Falha no UseCase ListVideos: ${result.error}`);
      throw new InternalServerErrorException(result.error);
    }

    return result.getValue();
  }
}
