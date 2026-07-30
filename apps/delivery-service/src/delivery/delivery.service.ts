import { Inject, Injectable } from '@nestjs/common';
import { Channel } from './channels/channel.abstract';
import { Notification } from '@app/shared';
import { StrategyFactory } from './strategies/strategy.factory';
import { MetricService } from 'nestjs-otel';
import { Logger } from 'nestjs-pino';
import { Counter } from '@opentelemetry/api';
import { CHANNELS } from './channels/channels.constants';

@Injectable()
export class DeliveryService {
  private strategyCounter: Counter;

  constructor(
    @Inject(CHANNELS) private readonly channels: readonly Channel[],
    private readonly strategyFactory: StrategyFactory,
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
  }

  async deliver(notification: Notification): Promise<void> {
    const { id, correlationId, clientId, createdAt, contacts, mode } =
      notification;

    this.strategyCounter.add(1, {
      strategy_type: mode,
    });

    this.logger.log(
      {
        id,
        correlationId,
        clientId,
        createdAt,
        contacts,
        mode,
      },
      'Принят запрос на обработку уведомления',
    );

    await this.strategyFactory
      .get(notification.mode)
      .execute(notification, this.channels);

    this.logger.debug(
      {
        id,
        correlationId,
        clientId,
        createdAt,
        contacts,
        mode,
      },
      'Запрос на обработку уведомления успешно выполнен',
    );
  }
}
