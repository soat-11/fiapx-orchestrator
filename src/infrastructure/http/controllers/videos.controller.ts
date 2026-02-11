import {
  Controller,
  Post,
  Body,
  Logger,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";
import { CreateVideoUploadUseCase } from "@core/use-cases/create-video-upload.use-case";
import { CreateVideoDto } from "../dtos/create-video.dto";
import { CurrentUser } from "@infra/auth/current-user.decorator";

@ApiTags("Videos")
@ApiBearerAuth()
@Controller("videos")
export class VideosController {
  private readonly logger = new Logger(VideosController.name);

  constructor(private readonly createVideoUseCase: CreateVideoUploadUseCase) {}

  @Post()
  @UseGuards(AuthGuard("jwt"))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Inicia upload de vídeo",
    description: "Gera URL assinada. Requer Token JWT.",
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

    this.logger.log(`Requisição processada. Video ID: ${result.videoId}`);
    return result;
  }
}
