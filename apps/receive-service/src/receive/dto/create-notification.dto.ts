import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Mode, Contact, Provider } from '@app/shared';
import { CreateNotification } from '../types/CreateNotification';

class CreateNotificationContactDto implements Contact {
  @IsEnum(Provider)
  type!: Provider;

  @IsString()
  @IsNotEmpty()
  value!: string;
}

export class CreateNotificationDto implements CreateNotification {
  @IsString()
  @IsNotEmpty()
  readonly correlationId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateNotificationContactDto)
  readonly contacts!: readonly CreateNotificationContactDto[];

  @IsString()
  @IsNotEmpty()
  readonly message!: string;

  @IsEnum(Mode)
  @IsOptional()
  readonly mode = Mode.SEQUENTIAL;
}
