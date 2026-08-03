import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY, Public } from './public.decorator';

describe('Public Decorator', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  it('should be defined', () => {
    expect(Public).toBeDefined();
    expect(IS_PUBLIC_KEY).toBe('isPublic');
  });

  it('should apply metadata to a class', () => {
    @Public()
    class TestController {
      testMethod() {}
    }

    const metadata = reflector.get<boolean>(IS_PUBLIC_KEY, TestController);

    expect(metadata).toBe(true);
  });
});
