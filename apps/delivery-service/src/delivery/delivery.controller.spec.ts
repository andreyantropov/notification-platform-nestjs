import { Test, TestingModule } from '@nestjs/testing';
import { RmqContext } from '@nestjs/microservices';
import { Channel, Message } from 'amqplib';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { Mode, Provider } from '@app/shared';
import { NotificationDto } from './dto/notification.dto';

describe('DeliveryController', () => {
  let controller: DeliveryController;
  let mockDeliver: jest.Mock<Promise<void>, [NotificationDto]>;
  let mockAck: jest.Mock<void, [Message]>;
  let mockNack: jest.Mock<void, [Message, boolean, boolean]>;

  let mockContext: RmqContext;
  let mockMessage: Message;

  const mockNotificationDto: NotificationDto = {
    id: 'notif-789',
    correlationId: 'corr-789',
    clientId: 'billing-service',
    createdAt: new Date().toISOString(),
    message: 'Test Message',
    mode: Mode.BROADCAST,
    contacts: [{ type: Provider.EMAIL, value: 'test@test.com' }],
  };

  beforeEach(async () => {
    mockDeliver = jest.fn<Promise<void>, [NotificationDto]>();
    mockAck = jest.fn<void, [Message]>();
    mockNack = jest.fn<void, [Message, boolean, boolean]>();

    const mockChannelInstance = {
      ack: mockAck,
      nack: mockNack,
    } as unknown as Channel;

    mockMessage = {} as unknown as Message;

    mockContext = {
      getChannelRef: jest.fn().mockReturnValue(mockChannelInstance),
      getMessage: jest.fn().mockReturnValue(mockMessage),
    } as unknown as RmqContext;

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

  it('should successfully deliver notification and acknowledge the message in RabbitMQ', async () => {
    mockDeliver.mockResolvedValue(undefined);

    await expect(
      controller.handleNotification(mockNotificationDto, mockContext),
    ).resolves.not.toThrow();

    expect(mockDeliver).toHaveBeenCalledTimes(1);
    expect(mockDeliver).toHaveBeenCalledWith(mockNotificationDto);

    expect(mockAck).toHaveBeenCalledTimes(1);
    expect(mockAck).toHaveBeenCalledWith(mockMessage);
    expect(mockNack).not.toHaveBeenCalled();
  });

  it('should negatively acknowledge the message and requeue it back if delivery service fails', async () => {
    const deliveryError = new Error('SMTP server connection lost');
    mockDeliver.mockRejectedValue(deliveryError);

    await expect(
      controller.handleNotification(mockNotificationDto, mockContext),
    ).resolves.not.toThrow();

    expect(mockDeliver).toHaveBeenCalledTimes(1);

    expect(mockNack).toHaveBeenCalledTimes(1);
    expect(mockNack).toHaveBeenCalledWith(mockMessage, false, true);
    expect(mockAck).not.toHaveBeenCalled();
  });
});
