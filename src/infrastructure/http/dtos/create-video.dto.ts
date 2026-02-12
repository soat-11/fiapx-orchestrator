import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";

export class CreateVideoDto {
  @ApiProperty({
    description: "Nome original do arquivo de vídeo",
    example: "meu_treino.mp4",
  })
  @IsString()
  @IsNotEmpty()
  fileName: string;
}
