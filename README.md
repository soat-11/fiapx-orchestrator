# 🎥 Video Processing API - Hackathon FIAP

API desenvolvida seguindo os princípios de Clean Architecture para processamento assíncrono de vídeos. O sistema utiliza Presigned URLs para uploads diretos no Storage (S3), garantindo alta performance e baixo acumo de memória na aplicação.

🚀 Status do Projeto
Fase Atual: ✅ Upload Seguro & Persistência Inicial

[x] Configuração do Docker (Postgres + LocalStack)

[x] Estrutura de Pastas (Clean Architecture)

[x] Conexão com Banco de Dados (TypeORM)

[x] Integração com Storage S3 (AWS SDK v3)

[x] Geração de Links de Upload (Presigned URLs)

[ ] Processamento de Vídeo (FFmpeg) - Próximo passo

🛠 Tecnologias Utilizadas
NestJS - Framework Backend

TypeORM - ORM para PostgreSQL

PostgreSQL - Banco de dados relacional

LocalStack - Emulador de AWS (S3) para desenvolvimento local

Docker & Docker Compose - Orquestração de containers

AWS SDK v3 - Manipulação de serviços Cloud

## 🏗 Arquitetura (Clean Architecture)

O projeto está dividido em camadas para desacoplar regras de negócio de frameworks e ferramentas externas:

src/
├── core/ # 🧠 Regras de Negócio (Puro TypeScript)
│ ├── domain/ # Entidades e Enums (Video, VideoStatus)
│ ├── repositories/ # Interfaces (Contratos) para o Banco
│ ├── interfaces/ # Interfaces (Contratos) para Serviços (Storage)
│ └── use-cases/ # Lógica de Aplicação (CreateVideoUpload)
│
├── infra/ # 🔌 Adaptadores e Ferramentas
│ ├── database/ # Implementação TypeORM
│ ├── storage/ # Implementação AWS S3 (LocalStack)
│ └── http/ # Controllers e DTOs (API REST)
│
└── modules/ # 📦 Injeção de Dependência do NestJS

## ⚙️ Configuração do Ambiente

1. Variáveis de Ambiente (.env)
   Certifique-se de que seu arquivo .env tenha as configurações corretas para o LocalStack:

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=video_processor_db

# Configuração AWS / LocalStack
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=teste
AWS_SECRET_ACCESS_KEY=teste
AWS_S3_BUCKET_RAW=fiap-x-raw
# Importante para forçar o uso do LocalStack
AWS_ENDPOINT=http://localhost:4566
AWS_S3_FORCE_PATH_STYLE=true
```

2. Subir Infraestrutura

```
docker-compose up -d
```

Isso iniciará o PostgreSQL na porta 5432 e o LocalStack (S3) na porta 4566.

3. Iniciar a API

```
npm run start:dev
```

🧪 Como Testar o Fluxo de Upload (Passo a Passo)
Como utilizamos Presigned URLs, o upload é feito em duas etapas:

Passo 1: Solicitar Intenção de Upload
A API registra o vídeo no banco como PENDING e devolve uma URL assinada.

Rota: POST /videos Body:

```
{
  "fileName": "video_academia_hypefit.mp4",
  "userId": "usuario-teste-123"
}
```

Resposta Esperada:

```
{
  "videoId": "uuid-do-video",
  "uploadUrl": "http://localhost:4566/fiap-x-raw/raw/...",
  "status": "PENDING"
}
```

Passo 2: Fazer o Upload Real (Simulando o Frontend)
Com a uploadUrl em mãos, o cliente envia o arquivo binário diretamente para o S3.

Comando (via Terminal): Navegue até a pasta onde está o vídeo antes de rodar o comando.

Bash

```
curl -X PUT -T "nome_do_video.mp4" \
  -H "Content-Type: video/mp4" \
  "URL_GIGANTE_RECEBIDA_NO_PASSO_1"
```

Passo 3: Verificar se o arquivo chegou no S3
Para confirmar que o upload funcionou e o arquivo não está corrompido (0 bytes):

```
aws --endpoint-url=http://localhost:4566 s3 ls s3://fiap-x-raw --recursive
```
