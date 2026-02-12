import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IVideoRepository } from "@core/repositories/video-repository.interface";
import { Video } from "@core/domain/entities/video.entity";
import { TypeOrmVideo } from "../typeorm/entities/video.orm-entity";
import { VideoMapper } from "../mappers/video.mapper";

@Injectable()
export class TypeOrmVideoRepository implements IVideoRepository {
  private readonly logger = new Logger(TypeOrmVideoRepository.name);

  constructor(
    @InjectRepository(TypeOrmVideo)
    private readonly typeOrmRepo: Repository<TypeOrmVideo>,
  ) {}

  async create(video: Video): Promise<void> {
    this.logger.debug(`Mapeando vídeo ${video.id} para persistência...`);
    const persistenceModel = VideoMapper.toPersistence(video);

    await this.typeOrmRepo.save(persistenceModel);
    this.logger.log(`Vídeo ${video.id} salvo no Postgres com sucesso.`);
  }

  async findById(id: string): Promise<Video | null> {
    const found = await this.typeOrmRepo.findOne({ where: { id } });
    if (!found) return null;
    return VideoMapper.toDomain(found);
  }

  async update(video: Video): Promise<void> {
    const persistenceModel = VideoMapper.toPersistence(video);
    await this.typeOrmRepo.save(persistenceModel);
  }

  async findAllByUserId(userId: string): Promise<Video[]> {
    const schemas = await this.typeOrmRepo.find({
      where: { userId },
      order: { createdAt: "DESC" },
    });

    return schemas.map((schema) => VideoMapper.toDomain(schema));
  }
}
