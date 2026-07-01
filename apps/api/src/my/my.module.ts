import { Module } from '@nestjs/common';

import { AuthCommonModule } from '../common/auth-common.module';
import { MyController } from './my.controller';

@Module({
  imports: [AuthCommonModule],
  controllers: [MyController],
})
export class MyModule {}
