# 🎥 Video Processing API - Hackathon FIAP

Este microsserviço é o coração da plataforma de processamento de vídeos. Ele orquestra todo o fluxo de upload, estado e notificações, utilizando uma arquitetura Event-Driven e Clean Architecture para garantir escalabilidade e desacoplamento.

🏗 Arquitetura do Sistema
O sistema resolve o problema de uploads pesados e processamento assíncrono da seguinte forma:

Upload Inteligente: O cliente recebe uma Presigned URL para fazer upload direto no S3 (Zero carga na API).

Event Driven: A API não fica esperando. O S3 avisa quando o arquivo chega (SQS).

Desacoplamento: O processamento pesado (FFmpeg/Worker) é isolado via filas.

Resiliência: Tratamento de erros, retentativas e validação de mensagens ("Poison Messages").

```
graph LR
    User[Cliente] -- 1. POST /videos --> API[Orchestrator API]
    API -- 2. Retorna Presigned URL --> User
    User -- 3. PUT Upload (Binário) --> S3[Bucket Raw]
    S3 -- 4. Evento S3 --> Q1[SQS: upload-events]
    Q1 -- 5. Consome Evento --> API
    API -- 6. Atualiza DB (PROCESSING) --> DB[(Postgres)]
    API -- 7. Envia Job --> Q2[SQS: video-processing]
    Q2 -.-> Worker[Python Worker]
    Worker -.-> Q3[SQS: video-result]
    Q3 -- 8. Consome Resultado --> API
    API -- 9. Atualiza DB (DONE/ERROR) --> DB
    API -- 10. Notifica --> Q4[SQS: email-notification]
```

## 🛠 Tecnologias Utilizadas

NestJS - Framework Backend

TypeORM - ORM para PostgreSQL

PostgreSQL - Banco de dados relacional

LocalStack - Emulador de AWS (S3) para desenvolvimento local

Docker & Docker Compose - Orquestração de containers

AWS SDK v3 - Manipulação de serviços Cloud

## 🛠 Configuração e Instalação

1. Pré-requisitos
   Node.js (v18+)
   Docker & Docker Compose
   AWS CLI (Opcional, para debug)

## 🏗 Arquitetura (Clean Architecture)

O projeto está dividido em camadas para desacoplar regras de negócio de frameworks e ferramentas externas:

```
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
```

## ⚙️ Configuração do Ambiente

1. Variáveis de Ambiente (.env)
   Certifique-se de que seu arquivo .env tenha as configurações corretas para o LocalStack:

```
# Banco de Dados
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=video_processor_db

# AWS / LocalStack Configs
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_ENDPOINT=http://localhost:4566
AWS_S3_FORCE_PATH_STYLE=true

# Buckets
AWS_S3_BUCKET_RAW=fiap-x-raw

# Filas SQS (URLs do LocalStack)
AWS_SQS_UPLOAD_QUEUE_URL=http://localhost:4566/000000000000/upload-events-queue
AWS_SQS_PROCESSING_QUEUE_URL=http://localhost:4566/000000000000/video-processing-queue
AWS_SQS_RESULT_QUEUE_URL=http://localhost:4566/000000000000/video-result-queue
AWS_SQS_EMAIL_QUEUE_URL=http://localhost:4566/000000000000/email-notification-queue
```

2. Subir Infraestrutura

```
# 1. Subir Infraestrutura (Postgres + LocalStack)
docker-compose up -d

# 2. Instalar Dependências
npm install

# 3. Iniciar API (Modo Desenvolvimento)
npm run start:dev
```

Aguarde as mensagens 🎧 Ouvindo eventos... no terminal.

## 🧪 Roteiro de Teste (End-to-End)

Passo 1: Solicitar Upload
Gera um registro no banco e obtém a URL segura.

```
curl -X POST http://localhost:3000/videos \
  -H "Content-Type: application/json" \
  -d '{"userId": "demo-user", "fileName": "demo.mp4"}'
```

⚠️ IMPORTANTE: Copie o videoId retornado e a URL gigante de upload.

Passo 2: Realizar Upload (Simulando Frontend)

```
# Cria um arquivo fake
echo "conteudo de video" > demo.mp4

# Envia para o S3 (Cole a URL Gigante entre as aspas)
curl -X PUT -T "demo.mp4" -H "Content-Type: video/mp4" "COLE_A_URL_AQUI"
```

👀 Observe o Log da API: Ela detectará o arquivo automaticamente e mudará o status para PROCESSING.

Passo 3: Simular o Worker (Python)

```
aws --endpoint-url=http://localhost:4566 sqs send-message \
  --queue-url http://localhost:4566/000000000000/video-result-queue \
  --message-body '{"videoId": "SEU_VIDEO_ID", "status": "DONE", "outputKey": "zips/resultado.zip"}'
```

👀 Observe o Log da API: Ela processará o resultado, mudará o status para DONE e enviará a notificação.

Passo 4: Verificar Notificação (Email)
Confira se a mensagem final chegou na fila de emails.

```
aws --endpoint-url=http://localhost:4566 sqs receive-message \
  --queue-url http://localhost:4566/000000000000/email-notification-queue
```

## 🔌 Contratos de Integração (Worker)

Para garantir a interoperabilidade com o time de Engenharia de Dados (Python), definimos os seguintes contratos JSON.

Input (O que enviamos para o Worker)
Fila: video-processing-queue

```
{
  "videoId": "uuid-v4",
  "inputBucket": "fiap-x-raw",
  "inputKey": "raw/uuid-v4-nome.mp4"
}
```

Output (O que esperamos receber)
Fila: video-result-queue

Cenário Sucesso:

```
{
  "videoId": "uuid-v4",
  "status": "DONE",
  "outputKey": "zips/resultado.zip"
}
```

Cenário Erro:

```
{
  "videoId": "uuid-v4",
  "status": "ERROR",
  "errorMessage": "Falha no codec de vídeo"
}
```
