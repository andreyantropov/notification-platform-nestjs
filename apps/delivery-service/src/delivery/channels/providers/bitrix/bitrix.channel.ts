import { Inject, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, map, tap } from 'rxjs';
import { Contact, Provider } from '@app/shared';
import { type ConfigType } from '@nestjs/config';
import { bitrixConfig } from '../../../../config/bitrix.config';
import { plainToInstance } from 'class-transformer';
import { BitrixNotifyRequestDto } from './dto/bitrix-notify-request.dto';
import { Channel } from '../../core/channel.abstract';
import { ChannelContext } from '../../core/channel.context';

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
    const payload = plainToInstance(BitrixNotifyRequestDto, {
      user_id: contact.value,
      message,
    });

    try {
      await firstValueFrom(
        this.httpService
          .post<BitrixResponse>(
            `${this.baseUrl}/im.notify.personal.add.json`,
            payload,
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
