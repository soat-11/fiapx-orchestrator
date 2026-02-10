export enum VideoStatus {
  PENDING = "PENDING", // Usuário solicitou upload (link gerado)
  UPLOADED = "UPLOADED", // Arquivo chegou no S3 (S3 avisou)
  PROCESSING = "PROCESSING", // Worker pegou para processar
  DONE = "DONE", // Zip gerado com sucesso
  ERROR = "ERROR", // Falha no processo
}
