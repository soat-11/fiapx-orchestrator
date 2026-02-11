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
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from "@nestjs/swagger";
import { CreateVideoUploadUseCase } from "@core/use-cases/create-video-upload.use-case";
import { ListUserVideosUseCase } from "@core/use-cases/list-user-videos.use-case";
import { CreateVideoDto } from "../dtos/create-video.dto";
import { CurrentUser } from "@infra/auth/current-user.decorator";
import { UserIdHeaderGuard } from "@infra/auth/user-id.guard";

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
    description: "Gera URL assinada. Requer header x-user-id.",
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
  ) {
    this.logger.log(
      `Recebendo requisição de upload. User: ${user.userId} | Arquivo: ${createVideoDto.fileName}`,
    );

    const result = await this.createVideoUseCase.execute({
      fileName: createVideoDto.fileName,
      userId: user.userId,
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
