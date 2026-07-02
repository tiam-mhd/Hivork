'use client';

import type { TenantCustomerDetailResponseDto } from '@hivork/contracts/customers';
import { useState } from 'react';

import { CustomerDocumentGallery } from '@/app/(seller)/admin/customers/[id]/components/customer-document-gallery';
import { CustomerAddressesTab } from '@/components/customers/customer-addresses-tab';
import {
  CustomerContractsTab,
  CustomerPaymentsTab,
  CustomerTimelineTab,
} from '@/components/customers/customer-detail-tab-panels';
import { CustomerNotesTab } from '@/components/customers/customer-notes-tab';
import { CustomerOverviewTab } from '@/components/customers/customer-overview-tab';

export type CustomerDetailTabId =
  | 'overview'
  | 'addresses'
  | 'documents'
  | 'timeline'
  | 'payments'
  | 'contracts'
  | 'notes';

const TABS: Array<{ id: CustomerDetailTabId; label: string }> = [
  { id: 'overview', label: 'نمای کلی' },
  { id: 'addresses', label: 'آدرس‌ها' },
  { id: 'documents', label: 'مدارک' },
  { id: 'timeline', label: 'خط زمانی' },
  { id: 'payments', label: 'پرداخت‌ها' },
  { id: 'contracts', label: 'قراردادها' },
  { id: 'notes', label: 'یادداشت‌ها' },
];

type CustomerDetailTabsProps = {
  customerId: string;
  detail: TenantCustomerDetailResponseDto;
  assignedStaffName?: string | null;
  onToast?: (message: string) => void;
};

export function CustomerDetailTabs({
  customerId,
  detail,
  assignedStaffName,
  onToast,
}: CustomerDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<CustomerDetailTabId>('overview');

  return (
    <div className="flex flex-col gap-4">
      <div
        className="-mx-1 flex gap-2 overflow-x-auto border-b border-border px-1 pb-px"
        role="tablist"
        aria-label="بخش‌های جزئیات مشتری"
      >
        {TABS.map((tab) => {
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`customer-tab-panel-${tab.id}`}
              id={`customer-tab-${tab.id}`}
              className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                selected
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        id={`customer-tab-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`customer-tab-${activeTab}`}
      >
        {activeTab === 'overview' ? (
          <CustomerOverviewTab detail={detail} assignedStaffName={assignedStaffName} />
        ) : null}

        {activeTab === 'addresses' ? <CustomerAddressesTab detail={detail} /> : null}

        {activeTab === 'documents' ? (
          <CustomerDocumentGallery
            customerId={customerId}
            active={activeTab === 'documents'}
            onToast={onToast}
          />
        ) : null}

        {activeTab === 'timeline' ? (
          <CustomerTimelineTab customerId={customerId} active={activeTab === 'timeline'} />
        ) : null}

        {activeTab === 'payments' ? (
          <CustomerPaymentsTab customerId={customerId} active={activeTab === 'payments'} />
        ) : null}

        {activeTab === 'contracts' ? (
          <CustomerContractsTab customerId={customerId} active={activeTab === 'contracts'} />
        ) : null}

        {activeTab === 'notes' ? (
          <CustomerNotesTab customerId={customerId} active={activeTab === 'notes'} />
        ) : null}
      </div>
    </div>
  );
}
