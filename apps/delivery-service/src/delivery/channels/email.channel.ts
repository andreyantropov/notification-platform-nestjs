import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { from, firstValueFrom, timeout } from 'rxjs';
import { Contact, Provider } from '@app/shared';
import { Channel } from '../abstracts/channel.abstract';
import { EmailChannelConfig } from './email.channel.config';

@Injectable()
export class EmailChannel extends Channel {
  readonly type = Provider.EMAIL;

  private readonly from: string;
  private readonly subject: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly mailerService: MailerService,
    { from, subject, timeoutMs }: EmailChannelConfig,
  ) {
    super();

    this.from = from;
    this.subject = subject;
    this.timeoutMs = timeoutMs;
  }

  async send(contact: Contact, message: string): Promise<void> {
    try {
      await firstValueFrom(
        from(
          this.mailerService.sendMail({
            from: this.from,
            to: contact.value,
            subject: this.subject,
            text: message,
          }),
        ).pipe(timeout(this.timeoutMs)),
      );
    } catch (error) {
      throw new Error(`Не удалось отправить уведомление через Email`, {
        cause: error,
      });
    }
  }
}
