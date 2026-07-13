import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { Provider } from '../enums/provider.enum';
import { Contact } from '../interfaces/contact.interface';

export class ContactDto implements Contact {
  @IsEnum(Provider, { message: 'Неподдерживаемый провайдер связи' })
  type!: Provider;

  @IsString()
  @IsNotEmpty({ message: 'Значение контакта не должно быть пустым' })
  value!: string;
}
