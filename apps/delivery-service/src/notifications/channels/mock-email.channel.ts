import { Injectable } from '@nestjs/common';
import { Channel } from '../interfaces/channel.interface';
import { Contact } from '../interfaces/contact.interface';
import { Provider } from '../enums/provider.enum';

@Injectable()
export class MockEmailChannel implements Channel {
  readonly type = Provider.EMAIL;

  isSupports(contact: Contact): boolean {
    return contact.type === Provider.EMAIL;
  }

  async send(contact: Contact, message: string): Promise<void> {
    if (!this.isSupports(contact)) {
      throw new Error(
        `Неверный тип получателя: ожидается email, получено "${contact.type}"`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
    console.log(`[MOCK EMAIL] To: ${contact.value} | Message: ${message}`);
  }
}
