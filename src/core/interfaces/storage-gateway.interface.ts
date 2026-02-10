export abstract class IStorageGateway {
  abstract generatePresignedUrl(
    fileName: string,
  ): Promise<{ url: string; fileKey: string }>;
}
