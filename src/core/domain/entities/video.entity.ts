import { VideoStatus } from "../enums/video-status.enum";
import { v4 as uuidv4 } from "uuid";

export class Video {
  public id: string;
  public userId: string;
  public fileName: string;
  public s3KeyRaw: string;
  public s3KeyZip: string | null;
  public status: VideoStatus;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(props: Partial<Video>) {
    Object.assign(this, props);

    if (!this.id) {
      this.id = uuidv4();
    }

    if (!this.status) {
      this.status = VideoStatus.PENDING;
    }
  }

  public markAsUploaded(): void {
    this.status = VideoStatus.UPLOADED;
  }

  public startProcessing(): void {
    this.status = VideoStatus.PROCESSING;
  }

  public complete(s3KeyZip: string): void {
    this.status = VideoStatus.DONE;
    this.s3KeyZip = s3KeyZip;
  }

  public fail(): void {
    this.status = VideoStatus.ERROR;
  }
}
