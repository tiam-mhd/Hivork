import { ApplicationError } from '@hivork/application';
import { ErrorCodes } from '@hivork/contracts';
import { DomainError } from '@hivork/domain';
import { HardDeleteForbiddenError } from '@hivork/infrastructure';
import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { HttpExceptionFilter } from './http-exception.filter.js';

function createHost() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));

  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url: '/test', method: 'GET' }),
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  it('maps HttpException with explicit code', () => {
    const { host, status, json } = createHost();

    filter.catch(
      new HttpException(
        { code: 'NOT_FOUND', message: 'Entity not found' },
        HttpStatus.NOT_FOUND,
      ),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith({
      code: 'NOT_FOUND',
      message: 'Entity not found',
    });
  });

  it('maps ApplicationError-shaped HttpException details', () => {
    const { host, json } = createHost();

    filter.catch(
      new HttpException(
        {
          code: 'NEED_TENANT_SLUG',
          message: 'Multiple tenants match this phone.',
          details: { tenantSlugs: ['shop-a', 'shop-b'] },
        },
        HttpStatus.CONFLICT,
      ),
      host,
    );

    expect(json).toHaveBeenCalledWith({
      code: 'NEED_TENANT_SLUG',
      message: 'Multiple tenants match this phone.',
      details: { tenantSlugs: ['shop-a', 'shop-b'] },
    });
  });

  it('maps direct ApplicationError', () => {
    const { host, json } = createHost();

    filter.catch(
      new ApplicationError('OTP_INVALID', 'Invalid OTP code.', 401),
      host,
    );

    expect(json).toHaveBeenCalledWith({
      code: 'OTP_INVALID',
      message: 'Invalid OTP code.',
    });
  });

  it('maps DomainError through application error mapping', () => {
    const { host, status, json } = createHost();

    filter.catch(new DomainError('ALREADY_DELETED'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith({
      code: 'ALREADY_DELETED',
      message: 'ALREADY_DELETED',
    });
  });

  it('maps HardDeleteForbiddenError to 403', () => {
    const { host, status, json } = createHost();

    filter.catch(new HardDeleteForbiddenError('TenantCustomer'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(json).toHaveBeenCalledWith({
      code: ErrorCodes.HARD_DELETE_FORBIDDEN,
      message: 'Hard delete is forbidden on TenantCustomer. Use soft delete instead.',
    });
  });

  it('maps unknown errors to INTERNAL_ERROR without stack in body', () => {
    const { host, status, json } = createHost();

    filter.catch(new Error('boom'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith({
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Internal server error',
    });
  });

  it('falls back to status-based code for generic HttpException', () => {
    const { host, json } = createHost();

    filter.catch(new UnauthorizedException('Missing token'), host);

    expect(json).toHaveBeenCalledWith({
      code: ErrorCodes.UNAUTHORIZED,
      message: 'Missing token',
    });
  });
});
