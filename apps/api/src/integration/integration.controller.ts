import { Controller, Get } from '@nestjs/common';

import { CurrentApiKey } from '../common/decorators/current-api-key.decorator.js';
import { RequireApiKey } from '../common/decorators/require-api-key.decorator.js';
import type { ApiKeyContext } from '../common/types/api-key-context.js';

@Controller('v1/integration')
export class IntegrationController {
  @Get('whoami')
  @RequireApiKey()
  whoami(@CurrentApiKey() apiKey: ApiKeyContext) {
    return {
      tenantId: apiKey.tenantId,
      apiKeyId: apiKey.apiKeyId,
      scopes: apiKey.scopes,
    };
  }
}
