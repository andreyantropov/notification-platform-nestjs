import { Notification } from '@app/shared';
import { Inject, Injectable } from '@nestjs/common';
import { CreateNotification } from './types/create-notification.type';
import { v4 } from 'uuid';
import { ClientProxy } from '@nestjs/microservices';
import {
  DELIVERY_NOTIFICATIONS_SEND_QUEUE,
  RMQ_CLIENT,
} from './receive.constants';
import { firstValueFrom } from 'rxjs';
import { plainToInstance } from 'class-transformer';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { BatchItemResponse } from './types/batch-item-response.interface';
import { BatchResponse } from './types/batch-response.interface';
import { validate } from 'class-validator';

@Injectable()
export class ReceiveService {
  constructor(
    @Inject(RMQ_CLIENT)
    private readonly rmqClient: ClientProxy,
  ) {}

  async receive(
    createNotification: CreateNotification,
    clientId: string,
  ): Promise<Notification> {
    const notification: Notification = {
      ...createNotification,
      id: v4(),
      createdAt: new Date().toISOString(),
      clientId,
    };

    await firstValueFrom(
      this.rmqClient.emit(DELIVERY_NOTIFICATIONS_SEND_QUEUE, notification),
    );

    return notification;
  }

  async receiveBatch(
    items: readonly unknown[],
    clientId: string,
  ): Promise<BatchResponse> {
    const promises = items.map((item) =>
      this.processSingleItem(item, clientId),
    );
    const settledResults = await Promise.allSettled(promises);

    return this.aggregateBatchResults(settledResults);
  }

  private async processSingleItem(
    item: unknown,
    clientId: string,
  ): Promise<BatchItemResponse> {
    try {
      const singleDto = plainToInstance(CreateNotificationDto, item);
      const validationErrors = await validate(singleDto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      if (validationErrors.length > 0) {
        return {
          status: 'client_error',
          data: item,
          error: validationErrors.map((err) => ({
            property: err.property,
            constraints: err.constraints,
          })),
        };
      }

      const createdNotification = await this.receive(singleDto, clientId);

      return {
        status: 'success',
        data: createdNotification,
      };
    } catch {
      return {
        status: 'server_error',
        data: item,
        error: 'Internal Error',
      };
    }
  }

  private aggregateBatchResults(
    settledResults: PromiseSettledResult<BatchItemResponse>[],
  ): BatchResponse {
    const results: BatchItemResponse[] = [];
    let success = 0;
    let clientError = 0;
    let serverError = 0;

    for (const settledResult of settledResults) {
      if (settledResult.status === 'fulfilled') {
        const itemResult = settledResult.value;
        results.push(itemResult);

        if (itemResult.status === 'success') success++;
        if (itemResult.status === 'client_error') clientError++;
        if (itemResult.status === 'server_error') serverError++;
      } else {
        serverError++;
        results.push({
          status: 'server_error',
          data: null,
          error: 'Internal Error',
        });
      }
    }

    return {
      summary: {
        total: settledResults.length,
        success,
        clientError,
        serverError,
      },
      items: results,
    };
  }

  async checkHealth(): Promise<void> {
    try {
      await this.rmqClient.connect();
    } catch (error) {
      throw new Error('RabbitMQ недоступен', { cause: error });
    }
  }
}
