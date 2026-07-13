import { Test, TestingModule } from '@nestjs/testing';
import { MailerService } from '@nestjs-modules/mailer';
import { EmailChannel } from './email.channel';
import { EmailChannelConfig } from './email.channel.config';
import { Provider, Contact } from '@app/shared';

describe('EmailChannel', () => {
  let channel: EmailChannel;
  let mockSendMail: jest.Mock;
  let mockVerify: jest.Mock;

  const mockConfig: EmailChannelConfig = {
    from: 'noreply@test.com',
    subject: 'Test Subject',
    timeoutMs: 5000,
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

  describe('constructor', () => {
    it('should be successfully initialized with correct provider type', () => {
      expect(channel).toBeDefined();
      expect(channel.type).toBe(Provider.EMAIL);
    });
  });

  describe('isSupports', () => {
    it('should return true if contact type matches EMAIL provider', () => {
      const validContact: Contact = {
        type: Provider.EMAIL,
        value: 'user@test.com',
      };
      expect(channel.isSupports(validContact)).toBe(true);
    });

    it('should return false if contact type does not match EMAIL provider', () => {
      const invalidContact: Contact = { type: Provider.BITRIX, value: '14253' };
      expect(channel.isSupports(invalidContact)).toBe(false);
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
        'Не удалось отправить уведомление через Email',
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
        'SMTP сервер недоступен',
      );
      expect(mockVerify).toHaveBeenCalledTimes(1);
    });
  });
});
