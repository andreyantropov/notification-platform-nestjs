# 📡 Телеметрия и Наблюдаемость

Сервис уведомлений обеспечивает полную **наблюдаемость (observability)** через интеграцию **OpenTelemetry** в экосистему NestJS. Телеметрия строится на трёх столпах: логирование, метрики и трассировка, экспортируемые по стандарту **OTLP/HTTP**.

Архитектура телеметрии построена на следующих принципах:

- ✅ **NestJS-native**: Используется `nestjs-otel` для бесшовной интеграции с DI-контейнером и lifecycle-хуками фреймворка.
- ✅ **Независимость от бэкенда**: Приложение экспортирует данные по протоколу OTLP/HTTP, не зная о конечном хранилище (маршрутизацию решает OTel Collector).
- ✅ **Сквозная корреляция**: Все события связаны через `trace_id` и `span_id` (W3C Trace Context), что позволяет отследить путь уведомления от HTTP-запроса до доставки в канал.
- ✅ **Отказоустойчивость**: При недоступности OTel Collector логи дублируются в `stdout` (Pino), не блокируя работу сервиса. Экспортёр работает в batch-режиме.
- ✅ **Строгое разделение ответственности**: Бизнес-код **никогда** не взаимодействует с `MetricService`, `Logger` или `Tracer` напрямую для целей наблюдаемости. Вся телеметрия собирается исключительно через доменные события и выделенный `TelemetryService`. Это гарантирует, что ни один модуль не содержит кода наблюдаемости.

---

## 🏗 Архитектура сбора данных

### ⚠️ Критическое требование к запуску

Модуль инициализации OpenTelemetry (`otelSDK.start()`) должен быть выполнен самым первым в точке входа приложения, до импорта любых бизнес-модулей.

### Компоненты наблюдаемости

1.  **Логирование**:
    - Реализовано на базе **Pino** с автоматической инструментацией через `@opentelemetry/instrumentation-pino`.
    - Структурированные логи наблюдаемости пишутся **только в `TelemetryService`** в ответ на доменные события. Прямое логирование в бизнес-коде допустимо исключительно для отладки.
    - Инструментация автоматически обогащает каждый лог контекстом активного трейса (`trace_id`, `span_id`).
    - Логи экспортируются в OTel Collector через `OTLPLogExporter` (HTTP) в batch-режиме.

2.  **Метрики**:
    - Сбор осуществляется через **`MetricService`** из `nestjs-otel`, внедряемый через DI.
    - Метрики **никогда не обновляются в бизнес-коде напрямую**. Все сервисы, каналы и стратегии эмитируют доменные события, а `TelemetryService` каждого микросервиса подписывается на них и централизованно управляет метриками.
    - Экспорт через `OTLPMetricExporter` (HTTP) с периодической отправкой (`PeriodicExportingMetricReader`).
    - Системные метрики собираются средствами Docker.

3.  **Трассировка**:
    - **Приоритет — автоинструментация**: `@fastify/otel` и `nestjs-otel` автоматически создают спаны для HTTP-запросов, контроллеров, сервисов, guards, interceptors и middleware. Бизнес-код не должен зависеть от библиотеки трассировки.
    - **Ручное создание спанов** (`@Span()`, `TraceService`) используется **только когда автоинструментация не покрывает сценарий**: кросс-модульные бизнес-операции, пакетная обработка, семантические спаны, не совпадающие с границами методов.
    - **Контекст**: `AsyncLocalStorageContextManager` обеспечивает корректную пропагацию трейса через асинхронные вызовы.
    - **Пропагация**: W3C Trace Context для сквозной трассировки между сервисами.
    - Спаны экспортируются через `OTLPTraceExporter` (HTTP) в batch-режиме.

4.  **Экспорт и Graceful Shutdown**:
    - Все три сигнала отправляются по протоколу OTLP/HTTP в OTel Collector.
    - При получении `SIGTERM` / `SIGINT` NestJS выполняет graceful shutdown, в ходе которого OTel SDK flush-ит все незавершённые batch'и.

> ⚙️ URL-адреса экспортеров задаются через переменные окружения: `TRACES_EXPORTER_URL`, `LOGS_EXPORTER_URL`, `METRICS_EXPORTER_URL`.

---

## 🔌 Event-Driven телеметрия (единый подход)

Бизнес-код **никогда** не импортирует `MetricService`, `Logger` или OTel SDK напрямую для целей наблюдаемости. Вся телеметрия строится на доменных событиях:

1.  Бизнес-модуль эмитирует событие через `EventEmitter`.
2.  `TelemetryService` (один на микросервис) подписывается на события через `@OnEvent`.
3.  `TelemetryService` обновляет метрики и пишет структурированные логи.

### Пример: приём уведомления (receive-service)

```typescript
// ReceiveService: только эмитирует событие
@Injectable()
export class ReceiveService {
  constructor(private readonly emitter: EventEmitter2) {}

  async receive(notification: IncomingNotification): Promise<void> {
    // ... валидация и постановка в очередь
    this.emitter.emit('notification.received', {
      clientId: notification.clientId,
      mode: notification.mode,
    });
  }
}

// TelemetryService receive-service: подписывается и считает
@OnEvent('notification.received')
handleReceived(payload: { clientId: string; mode: string }): void {
  this.receivedCounter.add(1, { clientId: payload.clientId });
  this.logger.log({ clientId: payload.clientId }, 'Уведомление принято');
}
```

### Пример: доставка через канал (delivery-service)

```typescript
// Channel: только эмитирует события
async send(contact: Contact, message: string): Promise<void> {
  const startTime = Date.now();
  try {
    this.ctx.events.emit('channel.delivery.initiated', {
      provider: this.type, contact: contact.value,
    });
    await this.performSend(contact, message);
    this.ctx.events.emit('channel.delivery.success', {
      provider: this.type, contact: contact.value,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    this.ctx.events.emit('channel.delivery.failed', {
      provider: this.type, contact: contact.value,
      duration: Date.now() - startTime, error,
    });
    throw error;
  }
}

// TelemetryService delivery-service: подписывается и считает
@OnEvent('channel.delivery.success')
handleSuccess(payload: ChannelResultPayload): void {
  const labels = { provider: payload.provider, status: 'success' };
  this.sendCounter.add(1, labels);
  this.durationHistogram.record(payload.duration, labels);
  this.logger.log({ provider: payload.provider }, 'Уведомление успешно отправлено');
}
```

> 💡 Каждый микросервис имеет **свой** `TelemetryService` со своим набором подписок. События не пересекаются между сервисами. Бизнес-код не знает, существует ли `TelemetryService` вообще.

### Реестр бизнес-метрик

| Имя метрики                                    | Тип       | Описание                                      | Лейблы               | Сервис           | Событие-триггер                   |
| :--------------------------------------------- | :-------- | :-------------------------------------------- | :------------------- | :--------------- | :-------------------------------- |
| `notification_incoming_received_total`         | Counter   | Принятые и поставленные в очередь уведомления | `clientId`           | receive-service  | `notification.received`           |
| `notification_strategy_executions_total`       | Counter   | Запуски бизнес-стратегий                      | `strategy_type`      | delivery-service | `delivery.initiated`              |
| `notification_channel_delivery_attempts_total` | Counter   | Попытки отправки по провайдерам               | `provider`, `status` | delivery-service | `channel.delivery.success/failed` |
| `notification_channel_delivery_duration_ms`    | Histogram | Длительность отправки внешним шлюзом          | `provider`, `status` | delivery-service | `channel.delivery.success/failed` |

---

## 🔍 Трассировка

Приоритетный подход — **автоинструментация** (`@fastify/otel`, `nestjs-otel`). Бизнес-код не должен зависеть от библиотеки трассировки.

Декоратор `@Span()` и прямой доступ к `TraceService` используются **только когда автоинструментация не покрывает сценарий**:

```typescript
// Только для случаев, которые не покрываются автоматически
import { Span } from 'nestjs-otel';

@Injectable()
export class StrategyExecutor {
  @Span('strategy.full_cycle')
  async executeWithFallback(notification: Notification): Promise<void> {
    // Кросс-модульная операция, не совпадающая с границами одного метода
  }
}
```

---

## ✅ Рекомендации разработчику

1.  **Никогда не импортируйте `MetricService` в бизнес-код**: Эмитируйте доменные события. Если нужна новая метрика — добавьте событие и обработчик в `TelemetryService`.
2.  **Никогда не пишите логи наблюдаемости в бизнес-коде**: Структурированные логи пишутся только в `TelemetryService`. Прямое логирование допустимо только для отладки внутри метода.
3.  **Типизируйте события**: Определяйте интерфейсы payload для каждого события. Нетипизированные события — источник багов в listener'ах.
4.  **Трейсы через автоинструментацию**: Не используйте `@Span()` по умолчанию. Сначала проверьте, покрывается ли сценарий автоинструментацией NestJS/Fastify.
5.  **Единый реестр метрик**: Новые метрики добавляйте только в `TelemetryService` и фиксируйте в таблице выше.
6.  **Graceful Shutdown**: Не вызывайте `process.exit()` напрямую. Используйте сигналы `SIGTERM`/`SIGINT`.

---

## 🧩 Интеграции

| Компонент                 | Роль                                                                           |
| :------------------------ | :----------------------------------------------------------------------------- |
| **nestjs-otel**           | NestJS-native интеграция OTel: MetricService, TraceService, автоинструментация |
| **Pino**                  | Ядро логирования, stdout + автообогащение трейсом                              |
| **@fastify/otel**         | Автоматическая инструментация Fastify (спаны, метрики HTTP)                    |
| **@nestjs/event-emitter** | Event-driven связь между бизнес-кодом и TelemetryService                       |
| **OTLP/HTTP Exporters**   | Экспорт логов, метрик и трейсов в OTel Collector                               |
| **OTel Collector**        | Централизованный шлюз: прием, обогащение, маршрутизация                        |
| **Grafana Stack**         | Визуализация: Loki (логи), Tempo (трейсы), Prometheus (метрики)                |
| **Telegram Bot**          | Канал для оперативных алертов на основе DLQ и пороговых метрик                 |
