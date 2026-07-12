import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, map, tap } from 'rxjs';
import { Contact, Provider } from '@app/shared';
import { Channel } from '../abstracts/channel.abstract';
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

  constructor(
    private readonly httpService: HttpService,
    private readonly config: BitrixChannelConfig,
  ) {
    super();
    this.baseUrl = `${this.config.url}/rest/${this.config.userId}/${this.config.authToken}`;
  }

  async send(contact: Contact, message: string): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService
          .post<BitrixResponse>(
            `${this.baseUrl}/im.notify.personal.add.json`,
            { user_id: contact.value, message },
            { timeout: this.config.timeoutMs },
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
