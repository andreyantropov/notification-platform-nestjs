import { BatchResultStatus } from './batch-result-status.type';

export interface BatchItemResponse {
  readonly status: BatchResultStatus;
  readonly data: unknown;
  readonly error?: unknown;
}
