import { Injectable } from '@nestjs/common';
import { Channel } from '../abstracts/channel.abstract';
import { Provider } from '@app/shared';
import { Contact } from '@app/shared';

@Injectable()
export class MockEmailChannel extends Channel {
  readonly type = Provider.EMAIL;

  async send(contact: Contact, message: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    console.log(`[MOCK EMAIL] To: ${contact.value} | Message: ${message}`);
  }
}
