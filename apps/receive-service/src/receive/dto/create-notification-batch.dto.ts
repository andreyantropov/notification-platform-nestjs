import { IsArray, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class CreateNotificationBatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  readonly items!: readonly unknown[];
}
