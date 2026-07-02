import { CreateTenantCustomerUseCase } from '@hivork/application';

import { PrismaAuditService } from '../audit/prisma-audit.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { PrismaBranchReader } from './branch.repository.js';
import { PrismaCustomerAddressRepository } from './customer-address.repository.js';
import { PrismaCustomerCategoryReader } from './customer-category.reader.js';
import { PrismaCustomerContactPhoneRepository } from './customer-contact-phone.repository.js';
import { PrismaCustomerEmergencyContactRepository } from './customer-emergency-contact.repository.js';
import { PrismaGlobalCustomerRepository } from './global-customer.repository.js';
import { PrismaStaffRepository } from './staff.repository.js';
import { PrismaTenantCustomerRepository } from './tenant-customer.repository.js';
import { PrismaTenantPlanReader } from './tenant-plan.reader.js';
import { PrismaUnitOfWork } from './prisma-unit-of-work.js';
import { PrismaUserRepository } from './user.repository.js';

export function buildCreateTenantCustomerUseCase(prisma: PrismaService): CreateTenantCustomerUseCase {
  return new CreateTenantCustomerUseCase(
    new PrismaUserRepository(prisma),
    new PrismaGlobalCustomerRepository(prisma),
    new PrismaTenantCustomerRepository(prisma),
    new PrismaCustomerAddressRepository(prisma),
    new PrismaCustomerEmergencyContactRepository(prisma),
    new PrismaCustomerContactPhoneRepository(prisma),
    new PrismaCustomerCategoryReader(prisma),
    new PrismaStaffRepository(prisma),
    new PrismaBranchReader(prisma),
    new PrismaTenantPlanReader(prisma),
    new PrismaUnitOfWork(prisma),
    new PrismaAuditService(prisma),
  );
}
