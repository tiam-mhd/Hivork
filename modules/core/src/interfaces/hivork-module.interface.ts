import type { INestApplication } from '@nestjs/common';

export type PermissionDefinition = {
  code: string;
  module: string;
  resource: string;
  action: string;
};

export interface HivorkModule {
  code: string;
  name: string;
  version: string;
  permissions: PermissionDefinition[];
  register(app: INestApplication): void;
}
