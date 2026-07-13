import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { Provider } from '../enums/provider.enum';
import { Contact } from '../interfaces/contact.interface';

export class ContactDto implements Contact {
  @IsEnum(Provider)
  type!: Provider;

  @IsString()
  @IsNotEmpty()
  value!: string;
}
