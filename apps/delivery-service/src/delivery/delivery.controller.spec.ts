import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { Mode, Provider } from '@app/shared';
import { SendNotificationCommandDto } from './dto/send-notification.command.dto';

describe('DeliveryController', () => {
  let controller: DeliveryController;
  let mockDeliver: jest.Mock<Promise<void>, [SendNotificationCommandDto]>;

  const mockSendNotificationCommandDto: SendNotificationCommandDto = {
    id: 'notif-789',
    correlationId: 'corr-789',
    clientId: 'billing-service',
    createdAt: new Date().toISOString(),
    message: 'Test Message',
    mode: Mode.BROADCAST,
    contacts: [{ type: Provider.EMAIL, value: 'test@test.com' }],
  };

  beforeEach(async () => {
    mockDeliver = jest.fn<Promise<void>, [SendNotificationCommandDto]>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliveryController],
      providers: [
        {
          provide: DeliveryService,
          useValue: {
            deliver: mockDeliver,
          },
        },
      ],
    }).compile();

    controller = module.get<DeliveryController>(DeliveryController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be successfully initialized', () => {
    expect(controller).toBeDefined();
  });

  it('should successfully deliver notification', async () => {
    mockDeliver.mockResolvedValue(undefined);

    await expect(
      controller.handleNotification(mockSendNotificationCommandDto),
    ).resolves.not.toThrow();

    expect(mockDeliver).toHaveBeenCalledTimes(1);
    expect(mockDeliver).toHaveBeenCalledWith(mockSendNotificationCommandDto);
  });

  it('should throw an error if delivery service fails, allowing NestJS to auto-nack', async () => {
    const deliveryError = new Error('SMTP server connection lost');
    mockDeliver.mockRejectedValue(deliveryError);

    await expect(
      controller.handleNotification(mockSendNotificationCommandDto),
    ).rejects.toThrow('SMTP server connection lost');

    expect(mockDeliver).toHaveBeenCalledTimes(1);
  });
});
