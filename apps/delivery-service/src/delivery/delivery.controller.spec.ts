import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { Mode, Provider } from '@app/shared';
import { SendNotificationCommandDto } from './dto/send-notification.command.dto';
import { RmqContext } from '@nestjs/microservices';
import { Channel, Message } from 'amqplib';

describe('DeliveryController', () => {
  let controller: DeliveryController;
  let mockDeliver: jest.Mock<Promise<void>, [SendNotificationCommandDto]>;

  let mockChannel: jest.Mocked<Partial<Channel>>;
  let mockMessage: jest.Mocked<Partial<Message>>;
  let mockRmqContext: jest.Mocked<Partial<RmqContext>>;

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

    mockChannel = {
      ack: jest.fn(),
      nack: jest.fn(),
    };
    mockMessage = {};

    mockRmqContext = {
      getChannelRef: jest.fn().mockReturnValue(mockChannel),
      getMessage: jest.fn().mockReturnValue(mockMessage),
    };

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

  it('should successfully deliver notification and call channel.ack', async () => {
    mockDeliver.mockResolvedValue(undefined);

    await expect(
      controller.handleNotification(
        mockSendNotificationCommandDto,
        mockRmqContext as RmqContext,
      ),
    ).resolves.not.toThrow();

    expect(mockDeliver).toHaveBeenCalledTimes(1);
    expect(mockDeliver).toHaveBeenCalledWith(mockSendNotificationCommandDto);

    expect(mockChannel.ack).toHaveBeenCalledTimes(1);
    expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
    expect(mockChannel.nack).not.toHaveBeenCalled();
  });

  it('should catch error, call channel.nack and not rethrow it', async () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const deliveryError = new Error('SMTP server connection lost');
    mockDeliver.mockRejectedValue(deliveryError);

    await expect(
      controller.handleNotification(
        mockSendNotificationCommandDto,
        mockRmqContext as RmqContext,
      ),
    ).resolves.not.toThrow();

    expect(mockDeliver).toHaveBeenCalledTimes(1);

    expect(mockChannel.nack).toHaveBeenCalledTimes(1);
    expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, false);
    expect(mockChannel.ack).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
