import { BatchItemResponse } from './batch-item-response.interface';

export interface BatchResponse {
  readonly total: number;
  readonly success: number;
  readonly clientError: number;
  readonly serverError: number;
  readonly items: readonly BatchItemResponse[];
}
