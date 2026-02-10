import {
  Controller,
  Post,
  Body,
  Logger,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { CreateVideoUploadUseCase } from "@core/use-cases/create-video-upload.use-case";
import { CreateVideoDto } from "../dtos/create-video.dto";

@ApiTags("Videos")
@Controller("videos")
export class VideosController {
  private readonly logger = new Logger(VideosController.name);

  constructor(private readonly createVideoUseCase: CreateVideoUploadUseCase) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Inicia upload de vídeo",
    description:
      "Gera uma URL assinada (S3) para upload direto e cria o registro no banco.",
  })
  @ApiResponse({ status: 201, description: "Upload iniciado com sucesso." })
  @ApiResponse({ status: 400, description: "Dados inválidos." })
  async create(@Body() createVideoDto: CreateVideoDto) {
    this.logger.log(
      `Recebendo requisição de upload: ${JSON.stringify(createVideoDto)}`,
    );

    const result = await this.createVideoUseCase.execute({
      fileName: createVideoDto.fileName,
      userId: createVideoDto.userId,
    });

    this.logger.log(`Requisição processada. Video ID: ${result.videoId}`);
    return result;
  }
}
