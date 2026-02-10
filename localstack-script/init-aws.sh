#!/bin/bash
echo "🔥 Inicializando LocalStack (S3 e SQS)..."

# 1. Cria os Buckets
awslocal s3 mb s3://fiap-x-raw
awslocal s3 mb s3://fiap-x-zip

# 2. Cria as Filas
awslocal sqs create-queue --queue-name upload-events-queue
awslocal sqs create-queue --queue-name video-processing-queue
awslocal sqs create-queue --queue-name video-result-queue
awslocal sqs create-queue --queue-name email-notification-queue

# 3. Configura notificação do S3 para o SQS (Simulação)
# Nota: No LocalStack a configuração de notificação é mais simples ou feita via API,
# mas só de ter as filas e buckets criados já adianta 90% do lado.

echo "✅ AWS Local pronta!"