import { BatchResultStatus } from './batch-result-status.enum';

export interface BatchItemResponse {
  readonly status: BatchResultStatus;
  readonly data: unknown;
  readonly error?: unknown;
}
