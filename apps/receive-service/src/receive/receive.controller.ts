import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  Res,
} from '@nestjs/common';
import { ReceiveService } from './receive.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { CreateNotificationBatchDto } from './dto/create-notification-batch.dto';
import { JwtAuthGuard, GetClientId } from '../auth';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ServerResponse } from 'http';

type BatchResultStatus = 'success' | 'client_error' | 'server_error';

interface BatchItemResponse {
  status: BatchResultStatus;
  data: unknown;
  error?: unknown;
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class ReceiveController {
  constructor(private readonly receiveService: ReceiveService) {}

  @Post()
  @HttpCode(202)
  async createNotification(
    @Body() data: CreateNotificationDto,
    @GetClientId() clientId: string,
  ) {
    return await this.receiveService.receive(data, clientId);
  }

  @Post('batch')
  async createNotificationBatch(
    @Body() data: CreateNotificationBatchDto,
    @GetClientId() clientId: string,
    @Res({ passthrough: true }) res: ServerResponse,
  ) {
    const promises = data.items.map(
      async (item): Promise<BatchItemResponse> => {
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

          const createdNotification = await this.receiveService.receive(
            singleDto,
            clientId,
          );

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
      },
    );

    const settledResults = await Promise.allSettled(promises);

    const results: BatchItemResponse[] = [];
    let successCount = 0;
    let clientErrorCount = 0;
    let serverErrorCount = 0;

    for (const settledResult of settledResults) {
      if (settledResult.status === 'fulfilled') {
        const itemResult = settledResult.value;
        results.push(itemResult);

        if (itemResult.status === 'success') successCount++;
        if (itemResult.status === 'client_error') clientErrorCount++;
        if (itemResult.status === 'server_error') serverErrorCount++;
      } else {
        serverErrorCount++;
        results.push({
          status: 'server_error',
          data: null,
          error: 'Internal Error',
        });
      }
    }

    const hasErrors = clientErrorCount > 0 || serverErrorCount > 0;
    res.statusCode = hasErrors ? 207 : 202;

    return {
      summary: {
        total: data.items.length,
        success: successCount,
        clientError: clientErrorCount,
        serverError: serverErrorCount,
      },
      items: results,
    };
  }
}
