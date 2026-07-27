import { Test, TestingModule } from '@nestjs/testing';
import { MailerService } from '@nestjs-modules/mailer';
import { EmailChannel } from './email.channel';
import { emailConfig } from '../../config';
import { Provider, Contact } from '@app/shared';

describe('EmailChannel', () => {
  let channel: EmailChannel;
  let mockSendMail: jest.Mock;
  let mockVerify: jest.Mock;

  const mockConfig = {
    from: 'noreply@test.com',
    subject: 'Test Subject',
    timeoutMs: 5_000,
    throttle: {
      maxConcurrent: 1,
      minTime: 500,
    },
  };

  beforeEach(async () => {
    mockSendMail = jest.fn();
    mockVerify = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailChannel,
        {
          provide: MailerService,
          useValue: {
            sendMail: mockSendMail,
            getTransporter: jest.fn().mockReturnValue({
              verify: mockVerify,
            }),
          },
        },
        {
          provide: emailConfig.KEY,
          useValue: mockConfig,
        },
      ],
    }).compile();

    channel = module.get<EmailChannel>(EmailChannel);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be successfully initialized with correct provider type', () => {
      expect(channel).toBeDefined();
      expect(channel.type).toBe(Provider.EMAIL);
    });
  });

  describe('send', () => {
    const contact: Contact = {
      type: Provider.EMAIL,
      value: 'recipient@test.com',
    };
    const message = 'Hello World SMTP';

    it('should successfully send an email via mailerService', async () => {
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

    it('should throw an error when underlying mailer delivery completely fails', async () => {
      const smtpError = new Error('Invalid SMTP Credentials');
      mockSendMail.mockRejectedValue(smtpError);

      await expect(channel.send(contact, message)).rejects.toThrow(
        'Канал email: Не удалось отправить уведомление',
      );
    });
  });

  describe('checkHealth', () => {
    it('should successfully pass health check when SMTP server is reachable and authorized', async () => {
      mockVerify.mockResolvedValue(true);

      await expect(channel.checkHealth()).resolves.not.toThrow();
      expect(mockVerify).toHaveBeenCalledTimes(1);
    });

    it('should throw an error during health check if SMTP connection verification fails', async () => {
      mockVerify.mockRejectedValue(new Error('Connection timeout'));

      await expect(channel.checkHealth()).rejects.toThrow(
        'Канал email: SMTP сервер недоступен',
      );
      expect(mockVerify).toHaveBeenCalledTimes(1);
    });
  });
});
