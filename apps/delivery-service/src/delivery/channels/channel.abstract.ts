import { Provider, Contact } from '@app/shared';
import Bottleneck from 'bottleneck';
import { ChannelContext } from './channel.context';
import { Counter, Histogram } from '@opentelemetry/api';

export abstract class Channel {
  protected abstract readonly type: Provider;
  protected readonly limiter: Bottleneck;

  private readonly sendCounter: Counter;
  private readonly durationHistogram: Histogram;

  constructor(
    protected readonly ctx: ChannelContext,
    config?: Bottleneck.ConstructorOptions,
  ) {
    this.limiter = new Bottleneck(config);

    this.sendCounter = this.ctx.metrics.getCounter(
      'notification_channel_delivery_attempts_total',
      {
        description:
          'Количество попыток отправки уведомлений по провайдерам и статусам',
      },
    );

    this.durationHistogram = this.ctx.metrics.getHistogram(
      'notification_channel_delivery_duration_ms',
      {
        description:
          'Длительность обработки отправки уведомления внешним шлюзом',
        unit: 'ms',
      },
    );
  }

  isSupports(contact: Contact): boolean {
    return contact.type === this.type;
  }

  async send(contact: Contact, message: string): Promise<void> {
    await this.limiter.schedule(async () => {
      const startTime = Date.now();

      const provider = this.type;
      let status = 'success';

      try {
        this.ctx.logger.debug(
          { provider, contact: contact.value },
          `Инициирована отправка уведомления.`,
        );

        await this.performSend(contact, message);

        this.ctx.logger.log(
          { provider, contact: contact.value },
          `Уведомление успешно отправлено.`,
        );
      } catch (error) {
        status = 'error';
        throw error;
      } finally {
        const duration = Date.now() - startTime;

        this.sendCounter.add(1, { provider, status });
        this.durationHistogram.record(duration, { provider, status });
      }
    });
  }

  async checkHealth(): Promise<void> {
    return Promise.resolve();
  }

  protected abstract performSend(
    contact: Contact,
    message: string,
  ): Promise<void>;
}
