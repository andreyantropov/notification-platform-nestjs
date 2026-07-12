import * as SMTPTransport from 'nodemailer/lib/smtp-transport';

export class EmailChannelConfig {
  constructor(
    public readonly transport: SMTPTransport.Options,
    public readonly fromEmail: string,
    public readonly subject: string,
  ) {}
}
