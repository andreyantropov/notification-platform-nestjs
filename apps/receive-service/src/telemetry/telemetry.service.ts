import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MetricService } from 'nestjs-otel';
import { Logger } from 'nestjs-pino';
import { Counter } from '@opentelemetry/api';
import { Notification } from '@app/shared';

interface ReceiveInitiatedPayload {
  readonly createNotification: Omit<
    Notification,
    'id' | 'clientId' | 'createdAt'
  >;
  readonly clientId: string;
}

interface ReceiveCompletedPayload {
  readonly notification: Notification;
}

interface ReceiveBatchPayload {
  readonly batchSize: number;
  readonly clientId: string;
}

@Injectable()
export class TelemetryService {
  private readonly receivedCounter: Counter;

  constructor(
    private readonly metrics: MetricService,
    private readonly logger: Logger,
  ) {
    this.receivedCounter = this.metrics.getCounter(
      'notification_incoming_received_total',
      {
        description: 'Количество принятых и отправленных в очередь уведомлений',
      },
    );
  }

  @OnEvent('receive.initiated')
  handleReceiveInitiated(payload: ReceiveInitiatedPayload): void {
    const { correlationId, contacts, mode } = payload.createNotification;

    this.logger.debug(
      { correlationId, clientId: payload.clientId, contacts, mode },
      'Инициирована обработка входящего уведомления',
    );
  }

  @OnEvent('receive.completed')
  handleReceiveCompleted(payload: ReceiveCompletedPayload): void {
    const { id, correlationId, clientId, createdAt, contacts, mode } =
      payload.notification;

    this.receivedCounter.add(1, { clientId });

    this.logger.log(
      { id, correlationId, clientId, createdAt, contacts, mode },
      'Уведомление успешно поставлено в очередь',
    );
  }

  @OnEvent('receive.batch.initiated')
  handleReceiveBatchInitiated(payload: ReceiveBatchPayload): void {
    this.logger.debug(
      { batch_size: payload.batchSize, clientId: payload.clientId },
      'Инициирована обработка пакета входящих уведомлений',
    );
  }

  @OnEvent('receive.batch.completed')
  handleReceiveBatchCompleted(payload: ReceiveBatchPayload): void {
    this.logger.log(
      { batch_size: payload.batchSize, clientId: payload.clientId },
      'Пакет уведомлений успешно поставлен в очередь',
    );
  }
}
