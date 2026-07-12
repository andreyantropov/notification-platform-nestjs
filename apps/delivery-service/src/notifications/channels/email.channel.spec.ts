import { Test, TestingModule } from '@nestjs/testing';
import { MailerService } from '@nestjs-modules/mailer';
import { EmailChannel } from './email.channel';
import { EmailChannelConfig } from './email.channel.config';
import { Provider, Contact } from '@app/shared';

describe('EmailChannel', () => {
  let channel: EmailChannel;
  let mockSendMail: jest.Mock;

  const mockConfig: EmailChannelConfig = {
    from: 'noreply@test.com',
    subject: 'Test Subject',
    timeoutMs: 5000,
  };

  beforeEach(async () => {
    mockSendMail = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailChannel,
        {
          provide: MailerService,
          useValue: {
            sendMail: mockSendMail,
          },
        },
        {
          provide: EmailChannelConfig,
          useValue: mockConfig,
        },
      ],
    }).compile();

    channel = module.get<EmailChannel>(EmailChannel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be successfully initialized', () => {
    expect(channel).toBeDefined();
    expect(channel.type).toBe(Provider.EMAIL);
  });

  it('should support EMAIL contact type', () => {
    const validContact: Contact = {
      type: Provider.EMAIL,
      value: 'user@test.com',
    };
    expect(channel.isSupports(validContact)).toBe(true);
  });

  it('should not support BITRIX contact type', () => {
    const invalidContact: Contact = { type: Provider.BITRIX, value: '14253' };
    expect(channel.isSupports(invalidContact)).toBe(false);
  });

  it('should successfully send an email', async () => {
    const contact: Contact = {
      type: Provider.EMAIL,
      value: 'recipient@test.com',
    };
    const message = 'Hello World SMTP';

    mockSendMail.mockResolvedValue({ messageId: 'smtp-123' });

    await expect(channel.send(contact, message)).resolves.not.toThrow();

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledWith({
      from: mockConfig.from,
      to: contact.value,
      subject: mockConfig.subject,
      text: message,
    });
  });

  it('should throw an error when sendMail completely fails', async () => {
    const contact: Contact = {
      type: Provider.EMAIL,
      value: 'recipient@test.com',
    };
    const message = 'Hello World SMTP';

    const smtpError = new Error('Invalid SMTP Credentials');
    mockSendMail.mockRejectedValue(smtpError);

    await expect(channel.send(contact, message)).rejects.toThrow(
      'Не удалось отправить уведомление через Email',
    );
  });
});
