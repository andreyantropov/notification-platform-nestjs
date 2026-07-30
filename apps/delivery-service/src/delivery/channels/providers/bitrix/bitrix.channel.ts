import { Inject, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, map, tap } from 'rxjs';
import { Contact, Provider } from '@app/shared';
import { type ConfigType } from '@nestjs/config';
import { Channel } from '../../channel.abstract';
import { bitrixConfig } from '../../../../config/bitrix.config';
import { ChannelContext } from '../../channel.context';

interface BitrixResponse {
  readonly result?: unknown;
  readonly error?: string;
  readonly error_description?: string;
}

@Injectable()
export class BitrixChannel extends Channel {
  protected readonly type = Provider.BITRIX;

  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly httpService: HttpService,
    ctx: ChannelContext,
    @Inject(bitrixConfig.KEY)
    {
      url,
      userId,
      authToken,
      timeoutMs,
      throttle,
    }: ConfigType<typeof bitrixConfig>,
  ) {
    super(ctx, throttle);

    this.baseUrl = `${url}/rest/${userId}/${authToken}`;
    this.timeoutMs = timeoutMs;
  }

  async checkHealth(): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService
          .post<BitrixResponse>(
            `${this.baseUrl}/server.time.json`,
            {},
            { timeout: this.timeoutMs },
          )
          .pipe(map((res) => res.data)),
      );
    } catch (error) {
      throw new Error(`Канал ${this.type}: Bitrix API недоступен`, {
        cause: error,
      });
    }
  }

  protected async performSend(
    contact: Contact,
    message: string,
  ): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService
          .post<BitrixResponse>(
            `${this.baseUrl}/im.notify.personal.add.json`,
            {
              user_id: contact.value,
              message,
            },
            { timeout: this.timeoutMs },
          )
          .pipe(
            map((res) => res.data),
            tap((data) => {
              if (data.error) {
                throw new Error(`${data.error}: ${data.error_description}`);
              }
            }),
          ),
      );
    } catch (error) {
      throw new Error(`Канал ${this.type}: Не удалось отправить уведомление`, {
        cause: error,
      });
    }
  }
}
