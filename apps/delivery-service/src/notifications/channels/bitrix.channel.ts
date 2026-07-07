import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Contact, Provider } from '@app/shared';
import type { BitrixConfig } from './interfaces/bitrix-config.interface';
import { Channel } from '../interfaces/channel.interface';
import { BitrixResponse } from './interfaces/bitrix-responce.interface';

@Injectable()
export class BitrixChannel implements Channel {
  readonly type = Provider.BITRIX;
  private readonly url: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly config: BitrixConfig,
  ) {
    this.url = `${this.config.baseUrl}/rest/${this.config.userId}/${this.config.authToken}/im.notify.personal.add.json`;
  }

  isSupports(contact: Contact): boolean {
    return contact.type === this.type;
  }

  async send(contact: Contact, message: string): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<BitrixResponse>(
          this.url,
          { user_id: contact.value, message },
          { timeout: this.config.timeoutMs },
        ),
      );

      if (response.data.error) {
        throw new Error(
          `${response.data.error}: ${response.data.error_description}`,
        );
      }
    } catch (error) {
      throw new Error(`Не удалось отправить уведомление через Bitrix`, {
        cause: error,
      });
    }
  }
}
