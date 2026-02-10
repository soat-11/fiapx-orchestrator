import { IsNotEmpty, IsString, Matches } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateVideoDto {
  @ApiProperty({
    description: "Nome do arquivo original (deve terminar em .mp4)",
    example: "minhas_ferias.mp4",
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/\.mp4$/, { message: "O arquivo deve ter a extensão .mp4" })
  fileName: string;

  @ApiProperty({
    description: "ID do usuário logado (simulado)",
    example: "user-123-abc",
  })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
