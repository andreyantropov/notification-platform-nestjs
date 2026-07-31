# Docker

Платформа состоит из двух stateless-сервисов: `receive-service` (приём) и `delivery-service` (доставка).  
Конфигурация передаётся **только через переменные окружения**.

## 1. Сборка образов

Выполняется из корня монорепозитория. Используется multi-stage сборка на базе `node:24.14.0-alpine`.

```bash
# delivery-service
docker build \
  --build-arg HTTP_PROXY=$HTTP_PROXY \
  --build-arg HTTPS_PROXY=$HTTPS_PROXY \
  --build-arg SERVICE_NAME=delivery-service \
  -f services/delivery-service/Dockerfile \
  -t delivery-service:1.0.0 .

# receive-service
docker build \
  --build-arg HTTP_PROXY=$HTTP_PROXY \
  --build-arg HTTPS_PROXY=$HTTPS_PROXY \
  --build-arg SERVICE_NAME=receive-service \
  -f services/receive-service/Dockerfile \
  -t receive-service:1.0.0 .
```

> **Важно:** В финальный образ попадают только скомпилированный `dist/` и production-зависимости. Исходники, тесты и dev-инструменты удалены.

## 2. Запуск

### Ручной запуск

Каждый сервис требует свой `.env`-файл.

```bash
# receive-service (порт 3001)
docker run -d \
  --name receive-service \
  --restart unless-stopped \
  --memory="512m" --cpus="0.5" \
  -p 3001:${PORT:-3001} \
  --env-file services/receive-service/.env.dev \
  receive-service:1.0.0

# delivery-service (порт 3002)
docker run -d \
  --name delivery-service \
  --restart unless-stopped \
  --memory="512m" --cpus="0.5" \
  -p 3002:${PORT:-3002} \
  --env-file services/delivery-service/.env.dev \
  delivery-service:1.0.0
```

### Docker Compose (рекомендуется)

Запуск всей платформы вместе с RabbitMQ одной командой из корня проекта:

```bash
# Запуск всех контейнеров
docker compose -f docker-compose.dev.yml up --build -d

# Только RabbitMQ
docker compose -f docker-compose.dev.yml up -d rabbitmq-dev

# Логи
docker compose -f docker-compose.dev.yml logs -f

# Остановка с очисткой томов
docker compose -f docker-compose.dev.yml down -v
```

**Доступные порты:**

| Сервис           | Внешний порт | Внутренний порт |
| ---------------- | ------------ | --------------- |
| Receive Service  | 3001         | `${PORT:-3001}` |
| Delivery Service | 3002         | `${PORT:-3001}` |
| RabbitMQ UI      | 15672        | 15672           |
| RabbitMQ AMQP    | 5672         | 5672            |

## 3. Контракт образа

| Параметр      | Значение                              |
| ------------- | ------------------------------------- |
| Базовый образ | `node:24.14.0-alpine`                 |
| Инициализатор | `dumb-init`                           |
| Пользователь  | `node` (non-root)                     |
| Порт          | `${PORT:-3001}`                       |
| Порт          | `${PORT:-3002}`                       |
| Healthcheck   | `GET /api/health/live` (интервал 60с) |
| Конфигурация  | Только `env`                          |

## 4. Требования к окружению

Из контейнера должен быть сетевой доступ к:

- **RabbitMQ** (`BROKER_URL`)
- **Bitrix24 API** (если используется канал)
- **SMTP сервер** (если используется email-канал)
- **OpenTelemetry Collector** (если включена телеметрия)

## 5. Проверка работоспособности

```bash
# Статус healthcheck
docker ps --filter "health=healthy"

# Liveness
curl http://localhost:3001/api/health/live

# Readiness
curl http://localhost:3002/api/health/ready
```
