import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MetricService } from 'nestjs-otel';
import { Logger } from 'nestjs-pino';
import { Counter, Histogram } from '@opentelemetry/api';
import { Notification } from '@app/shared';

interface ChannelBasePayload {
  readonly provider: string;
  readonly contact: string;
}

interface ChannelResultPayload extends ChannelBasePayload {
  readonly duration: number;
  readonly error?: unknown;
}

interface DeliveryPayload {
  readonly notification: Notification;
}

@Injectable()
export class TelemetryService {
  private readonly strategyCounter: Counter;
  private readonly sendCounter: Counter;
  private readonly durationHistogram: Histogram;

  constructor(
    private readonly metrics: MetricService,
    private readonly logger: Logger,
  ) {
    this.strategyCounter = this.metrics.getCounter(
      'notification_strategy_executions_total',
      {
        description:
          'Количество запусков бизнес-стратегий отправки уведомлений',
      },
    );

    this.sendCounter = this.metrics.getCounter(
      'notification_channel_delivery_attempts_total',
      {
        description:
          'Количество попыток отправки уведомлений по провайдерам и статусам',
      },
    );

    this.durationHistogram = this.metrics.getHistogram(
      'notification_channel_delivery_duration_ms',
      {
        description:
          'Длительность обработки отправки уведомления внешним шлюзом',
        unit: 'ms',
      },
    );
  }

  @OnEvent('delivery.initiated')
  handleDeliveryInitiated(payload: DeliveryPayload): void {
    const { id, correlationId, clientId, createdAt, contacts, mode } =
      payload.notification;

    this.strategyCounter.add(1, {
      strategy_type: mode,
    });

    this.logger.log(
      { id, correlationId, clientId, createdAt, contacts, mode },
      'Принят запрос на обработку уведомления',
    );
  }

  @OnEvent('delivery.completed')
  handleDeliveryCompleted(payload: DeliveryPayload): void {
    const { id, correlationId, clientId, createdAt, contacts, mode } =
      payload.notification;

    this.logger.debug(
      { id, correlationId, clientId, createdAt, contacts, mode },
      'Запрос на обработку уведомления успешно выполнен',
    );
  }

  @OnEvent('channel.delivery.initiated')
  handleChannelDeliveryInitiated(payload: ChannelBasePayload): void {
    const { provider, contact } = payload;

    this.logger.debug(
      { provider, contact },
      `Инициирована отправка уведомления.`,
    );
  }

  @OnEvent('channel.delivery.success')
  handleChannelDeliverySuccess(payload: ChannelResultPayload): void {
    const { provider, contact, duration } = payload;

    this.logger.log({ provider, contact }, `Уведомление успешно отправлено.`);

    const labels = { provider, status: 'success' };
    this.sendCounter.add(1, labels);
    this.durationHistogram.record(duration, labels);
  }

  @OnEvent('channel.delivery.failed')
  handleChannelDeliveryFailed(payload: ChannelResultPayload): void {
    const { provider, contact, duration, error } = payload;

    this.logger.warn(
      { error, provider, contact },
      `Сбой при отправке уведомления`,
    );

    const labels = { provider, status: 'error' };
    this.sendCounter.add(1, labels);
    this.durationHistogram.record(duration, labels);
  }
}
