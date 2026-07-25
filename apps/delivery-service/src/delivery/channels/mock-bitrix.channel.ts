import { Injectable } from '@nestjs/common';
import { Channel } from './channel.abstract';
import { Provider } from '@app/shared';
import { Contact } from '@app/shared';

@Injectable()
export class MockBitrixChannel extends Channel {
  protected readonly type = Provider.BITRIX;

  constructor() {
    super();
  }

  protected async performSend(
    contact: Contact,
    message: string,
  ): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    console.log(`[MOCK BITRIX] To: ${contact.value} | Message: ${message}`);
  }
}
