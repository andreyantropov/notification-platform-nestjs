import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { from, firstValueFrom, timeout } from 'rxjs';
import { Contact, Provider } from '@app/shared';
import { Channel } from './channel.abstract';
import { EmailChannelConfig } from './email.channel.config';

@Injectable()
export class EmailChannel extends Channel {
  readonly type = Provider.EMAIL;

  private readonly from: string;
  private readonly subject: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly mailerService: MailerService,
    { from, subject, timeoutMs, throttle }: EmailChannelConfig,
  ) {
    super(throttle);

    this.from = from;
    this.subject = subject;
    this.timeoutMs = timeoutMs;
  }

  async performSend(contact: Contact, message: string): Promise<void> {
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

  async checkHealth(): Promise<void> {
    try {
      await this.mailerService.getTransporter().verify();
    } catch (error) {
      throw new Error(`SMTP сервер недоступен`, { cause: error });
    }
  }
}
