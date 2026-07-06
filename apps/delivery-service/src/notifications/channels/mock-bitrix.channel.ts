import { Injectable } from '@nestjs/common';
import { Channel } from '../interfaces/channel.interface';
import { Provider } from '@app/shared/enums/provider.enum';
import { Contact } from '@app/shared/interfaces/contact.interface';

@Injectable()
export class MockBitrixChannel implements Channel {
  readonly type = Provider.BITRIX;

  isSupports(contact: Contact): boolean {
    return contact.type === Provider.BITRIX;
  }

  async send(contact: Contact, message: string): Promise<void> {
    if (!this.isSupports(contact)) {
      throw new Error(
        `Неверный тип получателя: ожидается id пользователя Bitrix, получено "${contact.type}"`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
    console.log(`[MOCK BITRIX] To: ${contact.value} | Message: ${message}`);
  }
}
