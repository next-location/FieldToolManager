'use client';

import { ReactNode } from 'react';
import { PagePackageGate } from '@/components/PagePackageGate';

interface ConsumableOrdersPageWrapperProps {
  children: ReactNode;
}

export default function ConsumableOrdersPageWrapper({ children }: ConsumableOrdersPageWrapperProps) {
  return (
    <PagePackageGate
      requiredFeature="asset.consumable_orders"
      fallbackMessage="消耗品発注管理はフル機能統合パックでご利用いただけます。発注書PDF生成機能と連携するため、帳票管理機能を含むフル機能パックが必要です。"
      redirectTo="/consumables"
    >
      {children}
    </PagePackageGate>
  );
}
