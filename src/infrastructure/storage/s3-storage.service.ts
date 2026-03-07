import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import { IStorageGateway } from "@core/interfaces/storage-gateway.interface";

@Injectable()
export class S3StorageService implements IStorageGateway {
  private readonly s3Client: S3Client;
  private readonly bucketRaw: string;
  private readonly logger = new Logger(S3StorageService.name);

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>("AWS_REGION") || "us-east-1";
    this.bucketRaw = this.configService.get<string>("AWS_S3_BUCKET_RAW");

    this.logger.log(
      `Inicializando S3 Client na região: ${region} | Bucket: ${this.bucketRaw}`,
    );

    this.s3Client = new S3Client({
      region: region,
    });
  }

  async generatePresignedUrl(
    fileName: string,
    videoId: string,
  ): Promise<{ url: string; fileKey: string }> {
    const fileKey = `raw/${videoId}-${fileName.replace(/\s+/g, "_")}`;
    this.logger.debug(`Gerando chave única para o arquivo: ${fileKey}`);

    const command = new PutObjectCommand({
      Bucket: this.bucketRaw,
      Key: fileKey,
      ContentType: "video/mp4",
    });

    try {
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: 900,
      });

      this.logger.log(`Presigned URL gerada com sucesso (Válida por 15min)`);
      return { url, fileKey };
    } catch (error) {
      this.logger.error(
        `Erro fatal ao conectar com S3: ${error.message}`,
        error.stack,
      );

      throw error;
    }
  }
}
