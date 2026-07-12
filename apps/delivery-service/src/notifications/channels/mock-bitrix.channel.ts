import { Injectable } from '@nestjs/common';
import { Channel } from '../abstracts/channel.abstract';
import { Provider } from '@app/shared';
import { Contact } from '@app/shared';

@Injectable()
export class MockBitrixChannel extends Channel {
  readonly type = Provider.BITRIX;

  async send(contact: Contact, message: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    console.log(`[MOCK BITRIX] To: ${contact.value} | Message: ${message}`);
  }
}
