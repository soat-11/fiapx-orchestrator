import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmVideo } from "./typeorm/entities/video.orm-entity";
import { TypeOrmVideoRepository } from "./repositories/typeorm-video.repository";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get<string>("DB_HOST"),
        port: configService.get<number>("DB_PORT"),
        username: configService.get<string>("DB_USER"),
        password: configService.get<string>("DB_PASSWORD"),
        database: configService.get<string>("DB_NAME"),
        autoLoadEntities: true,
        synchronize: true,
        entities: [TypeOrmVideo],
      }),
    }),
    TypeOrmModule.forFeature([TypeOrmVideo]),
  ],
  providers: [
    {
      provide: "IVideoRepository",
      useClass: TypeOrmVideoRepository,
    },
  ],
  exports: [TypeOrmModule, "IVideoRepository"],
})
export class DatabaseModule {}
