import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class BitrixNotifyRequestDto {
  @IsString()
  @IsNotEmpty()
  readonly user_id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  readonly message!: string;
}
