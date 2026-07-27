import { Inject, Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { from, firstValueFrom, timeout } from 'rxjs';
import { Contact, Provider } from '@app/shared';
import { Channel } from './channel.abstract';
import { emailConfig } from '../../config';
import { type ConfigType } from '@nestjs/config';

@Injectable()
export class EmailChannel extends Channel {
  protected readonly type = Provider.EMAIL;

  private readonly from: string;
  private readonly subject: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly mailerService: MailerService,
    @Inject(emailConfig.KEY)
    { from, subject, timeoutMs, throttle }: ConfigType<typeof emailConfig>,
  ) {
    super(throttle);

    this.from = from;
    this.subject = subject;
    this.timeoutMs = timeoutMs;
  }

  async checkHealth(): Promise<void> {
    try {
      await this.mailerService.getTransporter().verify();
    } catch (error) {
      throw new Error(`Канал ${this.type}: SMTP сервер недоступен`, {
        cause: error,
      });
    }
  }

  protected async performSend(
    contact: Contact,
    message: string,
  ): Promise<void> {
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
      throw new Error(`Канал ${this.type}: Не удалось отправить уведомление`, {
        cause: error,
      });
    }
  }
}
