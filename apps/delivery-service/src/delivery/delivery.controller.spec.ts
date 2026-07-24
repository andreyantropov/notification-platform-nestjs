import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { Mode, Provider } from '@app/shared';
import { SendNotificationDto } from '@app/shared';
import { RmqContext } from '@nestjs/microservices';
import { Channel, Message } from 'amqplib';

describe('DeliveryController', () => {
  let controller: DeliveryController;
  let mockDeliver: jest.Mock<Promise<void>, [SendNotificationDto]>;

  let mockChannel: {
    ack: jest.MockedFn<Channel['ack']>;
    nack: jest.MockedFn<Channel['nack']>;
  };
  let mockMessage: jest.Mocked<Partial<Message>>;
  let mockRmqContext: jest.Mocked<Partial<RmqContext>>;

  const mockSendNotificationDto: SendNotificationDto = {
    id: 'notif-789',
    correlationId: 'corr-789',
    clientId: 'billing-service',
    createdAt: new Date().toISOString(),
    message: 'Test Message',
    mode: Mode.BROADCAST,
    contacts: [{ type: Provider.EMAIL, value: 'test@test.com' }],
  };

  beforeEach(async () => {
    mockDeliver = jest.fn<Promise<void>, [SendNotificationDto]>();

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
        mockSendNotificationDto,
        mockRmqContext as RmqContext,
      ),
    ).resolves.not.toThrow();

    expect(mockDeliver).toHaveBeenCalledTimes(1);
    expect(mockDeliver).toHaveBeenCalledWith(mockSendNotificationDto);

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
        mockSendNotificationDto,
        mockRmqContext as RmqContext,
      ),
    ).resolves.not.toThrow();

    expect(mockDeliver).toHaveBeenCalledTimes(1);

    expect(mockChannel.nack).toHaveBeenCalledTimes(1);
    expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, false);
    expect(mockChannel.ack).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should handle crash if channel.ack itself throws an error', async () => {
    mockDeliver.mockResolvedValue(undefined);
    mockChannel.ack.mockImplementation(() => {
      throw new Error('Channel closed');
    });

    await expect(
      controller.handleNotification(
        mockSendNotificationDto,
        mockRmqContext as RmqContext,
      ),
    ).resolves.not.toThrow();

    expect(mockChannel.ack).toHaveBeenCalledTimes(1);
  });

  it('should handle crash if channel.nack itself throws an error on delivery failure', async () => {
    mockDeliver.mockRejectedValue(new Error('Delivery failed'));
    mockChannel.nack.mockImplementation(() => {
      throw new Error('Connection lost');
    });

    await expect(
      controller.handleNotification(
        mockSendNotificationDto,
        mockRmqContext as RmqContext,
      ),
    ).rejects.toThrow('Connection lost');

    expect(mockChannel.nack).toHaveBeenCalledTimes(1);
  });
});
