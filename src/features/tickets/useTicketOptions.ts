import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { SelectOption } from '@/components/ui';
import { PRIORITIES, STATUSES } from '@/data/constants';
import type { PriorityValue, StatusValue } from '@/data/types';

/** STATUSES / PRIORITIES with their labels translated for SelectInput. */
export function useTicketOptions() {
  const { t } = useTranslation();
  return useMemo(() => {
    const statuses: SelectOption<StatusValue>[] = STATUSES.map((s) => ({
      value: s.value,
      label: t(`status.${s.value}`),
      icon: s.icon,
    }));
    const priorities: SelectOption<PriorityValue>[] = PRIORITIES.map((p) => ({
      value: p.value,
      label: t(`priority.${p.value}`),
      icon: p.icon,
    }));
    return { statuses, priorities };
  }, [t]);
}
