import { Inject, Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { from, firstValueFrom, timeout } from 'rxjs';
import { Contact, Provider } from '@app/shared';
import { type ConfigType } from '@nestjs/config';
import { Channel } from '../../channel.abstract';
import { emailConfig } from '../../../../config/email.config';
import { ChannelContext } from '../../channel.context';
import { plainToInstance } from 'class-transformer';
import { EmailNotifyRequestDto } from './dto/email-notify-request.dto';

@Injectable()
export class EmailChannel extends Channel {
  protected readonly type = Provider.EMAIL;

  private readonly from: string;
  private readonly subject: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly mailerService: MailerService,
    ctx: ChannelContext,
    @Inject(emailConfig.KEY)
    { from, subject, timeoutMs, throttle }: ConfigType<typeof emailConfig>,
  ) {
    super(ctx, throttle);

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
    const payload = plainToInstance(EmailNotifyRequestDto, {
      from: this.from,
      to: contact.value,
      subject: this.subject,
      text: message,
    });

    try {
      await firstValueFrom(
        from(this.mailerService.sendMail(payload)).pipe(
          timeout(this.timeoutMs),
        ),
      );
    } catch (error) {
      throw new Error(`Канал ${this.type}: Не удалось отправить уведомление`, {
        cause: error,
      });
    }
  }
}
