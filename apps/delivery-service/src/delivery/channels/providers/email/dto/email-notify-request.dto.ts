import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class EmailNotifyRequestDto {
  @IsEmail({})
  @IsNotEmpty()
  readonly from!: string;

  @IsEmail({})
  @IsNotEmpty()
  readonly to!: string;

  @IsString()
  @IsNotEmpty()
  readonly subject!: string;

  @IsString()
  @IsNotEmpty()
  readonly text!: string;
}
