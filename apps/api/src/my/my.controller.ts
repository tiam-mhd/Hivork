import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';

import { CurrentCustomer } from '../common/decorators/current-customer.decorator';
import { RequireAuth } from '../common/decorators/require-auth.decorator';
import type { CustomerContext } from '../common/types/auth-context';

@Controller('v1/my')
@RequireAuth('customer')
export class MyController {
  @Get('profile')
  @HttpCode(HttpStatus.OK)
  getProfile(@CurrentCustomer() customer: CustomerContext) {
    return { id: customer.id };
  }
}
