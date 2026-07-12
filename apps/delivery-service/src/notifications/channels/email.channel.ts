import { Injectable } from '@nestjs/common';
import { Contact, Provider } from '@app/shared';
import { Channel } from '../abstracts/channel.abstract';
import { EmailChannelConfig } from './email.channel.config';
import { createTransport, Transporter } from 'nodemailer';

@Injectable()
export class EmailChannel extends Channel {
  readonly type = Provider.EMAIL;
  private readonly transporter: Transporter;

  constructor(private readonly config: EmailChannelConfig) {
    super();
    this.transporter = createTransport(this.config.transport);
  }

  async send(contact: Contact, message: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.config.fromEmail,
        to: contact.value,
        subject: this.config.subject,
        text: message,
      });
    } catch (error) {
      throw new Error(`Не удалось отправить уведомление через Email`, {
        cause: error,
      });
    }
  }
}
