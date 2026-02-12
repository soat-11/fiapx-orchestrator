export abstract class IStorageGateway {
  abstract generatePresignedUrl(
    fileName: string,
    videoId: string,
  ): Promise<{ url: string; fileKey: string }>;
}
