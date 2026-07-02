import type {
  ArchiveContractDto,
  CloseContractDto,
  CopyContractDto,
  ExtendContractDto,
  SaleDetailEnterpriseDto,
  TerminateContractDto,
} from '@hivork/contracts/installments';

import { apiFetch } from '@/lib/api/client';

type SaleDetailResponse = {
  data: SaleDetailEnterpriseDto;
};

type CopyContractResponse = {
  data: {
    newSaleId: string;
    contractNumber: string;
    sale: SaleDetailEnterpriseDto;
  };
};

export async function extendContract(
  saleId: string,
  body: ExtendContractDto,
): Promise<SaleDetailEnterpriseDto> {
  const response = await apiFetch<SaleDetailResponse>(`/sales/${saleId}/extend`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return response.data;
}

export async function copyContract(
  saleId: string,
  body: CopyContractDto,
): Promise<CopyContractResponse['data']> {
  const response = await apiFetch<CopyContractResponse>(`/sales/${saleId}/copy`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return response.data;
}

export async function terminateContract(
  saleId: string,
  body: TerminateContractDto,
): Promise<SaleDetailEnterpriseDto> {
  const response = await apiFetch<SaleDetailResponse>(`/sales/${saleId}/terminate`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return response.data;
}

export async function closeContract(
  saleId: string,
  body: CloseContractDto,
): Promise<SaleDetailEnterpriseDto> {
  const response = await apiFetch<SaleDetailResponse>(`/sales/${saleId}/close`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return response.data;
}

export async function archiveContract(
  saleId: string,
  body: ArchiveContractDto,
): Promise<SaleDetailEnterpriseDto> {
  const response = await apiFetch<SaleDetailResponse>(`/sales/${saleId}/archive`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return response.data;
}
