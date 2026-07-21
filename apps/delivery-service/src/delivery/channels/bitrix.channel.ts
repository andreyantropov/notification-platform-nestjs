import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, map, tap } from 'rxjs';
import { Contact, Provider } from '@app/shared';
import { Channel } from './channel.abstract';
import { BitrixChannelConfig } from './bitrix.channel.config';

interface BitrixResponse {
  readonly result?: unknown;
  readonly error?: string;
  readonly error_description?: string;
}

@Injectable()
export class BitrixChannel extends Channel {
  readonly type = Provider.BITRIX;

  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly httpService: HttpService,
    { url, userId, authToken, timeoutMs, throttle }: BitrixChannelConfig,
  ) {
    super(throttle);

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
      console.log(error);
      throw new Error(`Bitrix API недоступен`, {
        cause: error,
      });
    }
  }

  async performSend(contact: Contact, message: string): Promise<void> {
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
      throw new Error(`Не удалось отправить уведомление через Bitrix`, {
        cause: error,
      });
    }
  }
}
