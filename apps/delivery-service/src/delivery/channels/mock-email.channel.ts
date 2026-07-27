import { Injectable } from '@nestjs/common';
import { Channel } from './channel.abstract';
import { Provider } from '@app/shared';
import { Contact } from '@app/shared';

@Injectable()
export class MockEmailChannel extends Channel {
  protected readonly type = Provider.EMAIL;

  constructor() {
    super();
  }

  protected async performSend(
    contact: Contact,
    message: string,
  ): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    console.log(`[MOCK EMAIL] To: ${contact.value} | Message: ${message}`);
  }
}
