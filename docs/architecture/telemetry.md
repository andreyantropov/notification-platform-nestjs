# 📡 Телеметрия и Наблюдаемость

Сервис уведомлений обеспечивает полную **наблюдаемость (observability)** через интеграцию **OpenTelemetry** в экосистему NestJS. Телеметрия строится на трёх столпах: логирование, метрики и трассировка, экспортируемые по стандарту **OTLP/HTTP**.

Архитектура телеметрии построена на следующих принципах:

- ✅ **NestJS-native**: Используется `nestjs-otel` для бесшовной интеграции с DI-контейнером, декораторами и lifecycle-хуками фреймворка.
- ✅ **Независимость от бэкенда**: Приложение экспортирует данные по протоколу OTLP/HTTP, не зная о конечном хранилище (маршрутизацию решает OTel Collector).
- ✅ **Сквозная корреляция**: Все события связаны через `trace_id` и `span_id` (W3C Trace Context), что позволяет отследить путь уведомления от HTTP-запроса до доставки в канал.
- ✅ **Отказоустойчивость**: При недоступности OTel Collector логи дублируются в `stdout` (Pino), не блокируя работу сервиса. Экспортёр работает в batch-режиме.

---

## 🏗 Архитектура сбора данных

### ⚠️ Критическое требование к запуску

Модуль инициализации OpenTelemetry (`otelSDK.start()`) должен быть выполнен самым первым в точке входа приложения, до импорта любых бизнес-модулей.

### Компоненты наблюдаемости

1.  **Логирование**:
    - Реализовано на базе **Pino** с автоматической инструментацией через `@opentelemetry/instrumentation-pino`.
    - Бизнес-код использует стандартный NestJS `Logger` (или прямой вызов Pino). Логи могут быть произвольными структурированными объектами — жёсткого контракта на поля нет.
    - Инструментация автоматически обогащает каждый лог контекстом активного трейса (`trace_id`, `span_id`).
    - Логи экспортируются в OTel Collector через `OTLPLogExporter` (HTTP) в batch-режиме.

2.  **Метрики**:
    - Сбор осуществляется через **`MetricService`** из `nestjs-otel`, внедряемый через DI.
    - Метрики создаются и обновляются напрямую через API `MetricService` (Counter, Histogram, Gauge, UpDownCounter).
    - Экспорт через `OTLPMetricExporter` (HTTP) с периодической отправкой (`PeriodicExportingMetricReader`).
    - Системные метрики собираются средствами Docker.

3.  **Трассировка**:
    - **Автоматическая**: `@fastify/otel` инструментирует входящие HTTP-запросы. `nestjs-otel` автоматически создаёт спаны для контроллеров, сервисов, guards, interceptors и middleware.
    - **Ручная**: Для кастомных участков кода используются декораторы `@Span()` из `nestjs-otel` или прямой доступ к `Tracer` через DI.
    - **Контекст**: `AsyncLocalStorageContextManager` обеспечивает корректную пропагацию трейса через асинхронные вызовы.
    - **Пропагация**: W3C Trace Context для сквозной трассировки между сервисами.
    - Спаны экспортируются через `OTLPTraceExporter` (HTTP) в batch-режиме.

4.  **Экспорт и Graceful Shutdown**:
    - Все три сигнала отправляются по протоколу OTLP/HTTP в OTel Collector.
    - При получении `SIGTERM` / `SIGINT` NestJS выполняет graceful shutdown, в ходе которого OTel SDK flush-ит все незавершённые batch'и.

> ⚙️ URL-адреса экспортеров задаются через переменные окружения: `TRACES_EXPORTER_URL`, `LOGS_EXPORTER_URL`, `METRICS_EXPORTER_URL`.

---

## 🔌 Использование телеметрии в коде

### 1. Логирование

Логи — это произвольные структурированные объекты. Нет обязательного интерфейса или фиксированного набора полей. Пишите то, что нужно для диагностики.

```typescript
// Пример: лог может быть любым
this.logger.log({
  message: 'Уведомление отправлено',
  id: 'uuid-123',
  channel: 'email',
  durationMs: 245,
  strategy: 'broadcast',
});

// Или просто строка — Pino обернёт её в { msg: "..." }
this.logger.warn('Канал недоступен, переключаемся на фолбэк');
```

> 💡 Поля `trace_id`, `span_id`, `service.name`, `service.version`, `deployment.environment` добавляются автоматически инструментацией Pino и ресурсом OTel. Не передавайте их вручную.

> ⚠️ **Безопасность**: Никогда не передавайте в логи пароли, токены доступа или персональные данные (PII).

---

### 2. Метрики (`MetricService`)

Метрики создаются и обновляются через `MetricService`, внедряемый через DI:

```typescript
import { MetricService } from 'nestjs-otel';

@Injectable()
export class DeliveryService {
  private readonly sendCounter: Counter;
  private readonly durationHistogram: Histogram;

  constructor(protected readonly metricService: MetricService) {
    this.sendCounter = this.metricService.getCounter(
      'notification_channel_delivery_attempts_total',
      { description: 'Количество попыток отправки по провайдерам' },
    );
    this.durationHistogram = this.metricService.getHistogram(
      'notification_channel_delivery_duration_ms',
      { description: 'Длительность отправки внешним шлюзом', unit: 'ms' },
    );
  }

  async send(contact: Contact, message: string): Promise<void> {
    const startTime = Date.now();
    const provider = this.type;
    let status = 'success';

    try {
      await this.performSend(contact, message);
    } catch (error) {
      status = 'error';
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.sendCounter.add(1, { provider, status });
      this.durationHistogram.record(duration, { provider, status });
    }
  }
}
```

#### Реестр бизнес-метрик

| Имя метрики                                    | Тип       | Описание                                      | Лейблы               |
| :--------------------------------------------- | :-------- | :-------------------------------------------- | :------------------- |
| `notification_incoming_received_total`         | Counter   | Принятые и поставленные в очередь уведомления | `clientId`           |
| `notification_strategy_executions_total`       | Counter   | Запуски бизнес-стратегий                      | `strategy_type`      |
| `notification_channel_delivery_attempts_total` | Counter   | Попытки отправки по провайдерам               | `provider`, `status` |
| `notification_channel_delivery_duration_ms`    | Histogram | Длительность отправки внешним шлюзом          | `provider`, `status` |

---

### 3. Трассировка

В большинстве случаев трассировка работает **автоматически** благодаря `nestjs-otel` и `@fastify/otel`. Ручное создание спанов требуется только для нестандартных участков кода.

#### Декоратор `@Span()` (предпочтительный способ)

```typescript
import { Span } from 'nestjs-otel';

@Injectable()
export class StrategyExecutor {
  @Span('strategy.execute')
  async execute(notification: Notification): Promise<void> {
    // Спан создаётся и завершается автоматически
  }
}
```

#### Прямой доступ к Tracer (для динамических спанов)

```typescript
import { TraceService } from 'nestjs-otel';

@Injectable()
export class ChannelDispatcher {
  constructor(private readonly traceService: TraceService) {}

  async dispatch(channel: string, payload: unknown): Promise<void> {
    return this.traceService.startActiveSpan(
      `channel.${channel}.send`,
      async () => {
        // Логика отправки
      },
    );
  }
}
```

---

## ✅ Рекомендации разработчику

1.  **Логи свободны**: Пишите в логи всё, что полезно для диагностики. Не пытайтесь подгонять под жёсткий интерфейс. Но **никогда не пишите PII**.
2.  **Метрики через MetricService**: Не используйте OTel SDK напрямую. Всегда получайте инструменты через `MetricService` — это обеспечивает корректную интеграцию с NestJS DI и lifecycle.
3.  **Трейсы через декораторы**: Используйте `@Span()` вместо ручного управления спанами, когда это возможно. Это уменьшает boilerplate и исключает ошибки незакрытых спанов.
4.  **Единый реестр метрик**: Не придумывайте новые имена «на лету». Согласовывайте новые метрики, чтобы избежать дублирования и роста cardinality.
5.  **Graceful Shutdown**: Не вызывайте `process.exit()` напрямую. Используйте сигналы `SIGTERM`/`SIGINT`, чтобы NestJS и OTel SDK успели корректно завершить работу и flush-ить телеметрию.

---

## 🧩 Интеграции

| Компонент                                     | Роль                                                              |
| :-------------------------------------------- | :---------------------------------------------------------------- |
| **nestjs-otel**                               | NestJS-native интеграция OTel: MetricService, TraceService, @Span |
| **Pino**                                      | Ядро логирования, stdout + автообогащение трейсом                 |
| **@fastify/otel**                             | Автоматическая инструментация Fastify (спаны, метрики HTTP)       |
| **@opentelemetry/auto-instrumentations-node** | http и системные метрики                                          |
| **OTLP/HTTP Exporters**                       | Экспорт логов, метрик и трейсов в OTel Collector                  |
| **OTel Collector**                            | Централизованный шлюз: прием, обогащение, маршрутизация           |
| **Grafana Stack**                             | Визуализация: Loki (логи), Tempo (трейсы), Prometheus (метрики)   |
| **Telegram Bot**                              | Канал для оперативных алертов на основе DLQ и пороговых метрик    |
