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
  createNotification(
    @Body() data: CreateNotificationDto,
    @GetClientId() clientId: string,
  ) {
    return this.receiveService.receive(data, clientId);
  }

  @Post('batch')
  async createNotificationBatch(
    @Body() data: CreateNotificationBatchDto,
    @GetClientId() clientId: string,
    @Res({ passthrough: true }) res: ServerResponse,
  ) {
    const results: BatchItemResponse[] = [];

    let successCount = 0;
    let clientErrorCount = 0;
    let serverErrorCount = 0;

    for (const item of data.items) {
      try {
        const singleDto = plainToInstance(CreateNotificationDto, item);
        const validationErrors = await validate(singleDto, {
          whitelist: true,
          forbidNonWhitelisted: true,
        });

        if (validationErrors.length > 0) {
          clientErrorCount++;
          results.push({
            status: 'client_error',
            data: item,
            error: validationErrors.map((err) => ({
              property: err.property,
              constraints: err.constraints,
            })),
          });
          continue;
        }

        const createdNotification = this.receiveService.receive(
          singleDto,
          clientId,
        );

        successCount++;
        results.push({
          status: 'success',
          data: createdNotification,
        });
      } catch {
        serverErrorCount++;
        results.push({
          status: 'server_error',
          data: item,
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
