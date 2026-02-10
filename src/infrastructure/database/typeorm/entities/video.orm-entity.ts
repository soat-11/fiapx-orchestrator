import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { VideoStatus } from "@core/domain/enums/video-status.enum";

@Entity("videos")
export class TypeOrmVideo {
  @PrimaryColumn("uuid")
  id: string;

  @Column({ name: "user_id", nullable: true })
  userId: string;

  @Column({ name: "file_name" })
  fileName: string;

  @Column({ name: "s3_key_raw" })
  s3KeyRaw: string;

  @Column({ name: "s3_key_zip", nullable: true })
  s3KeyZip: string;

  @Column({
    type: "enum",
    enum: VideoStatus,
    default: VideoStatus.PENDING,
  })
  status: VideoStatus;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
