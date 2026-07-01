import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';

import { HealthCheckResult, HealthService } from './health.service';

@Controller('health')
export class HealthRootController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthCheckResult> {
    return this.respond(res);
  }

  private async respond(res: Response): Promise<HealthCheckResult> {
    const result = await this.healthService.check();
    if (result.status !== 'ok') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return result;
  }
}

@Controller('v1/health')
export class HealthV1Controller {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthCheckResult> {
    const result = await this.healthService.check();
    if (result.status !== 'ok') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return result;
  }
}
