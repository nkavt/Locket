import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { SelectOption } from '@/components/ui';
import { PRIORITIES } from '@/data/constants';
import type { PriorityValue, StatusValue, Workflow } from '@/data/types';

/** The workflow's statuses and the translated PRIORITIES, ready for SelectInput. */
export function useTicketOptions(workflow: Workflow) {
  const { t } = useTranslation();
  return useMemo(() => {
    const statuses: SelectOption<StatusValue>[] = workflow.statuses.map((s) => ({
      value: s.id,
      label: s.name,
      icon: s.icon,
    }));
    const priorities: SelectOption<PriorityValue>[] = PRIORITIES.map((p) => ({
      value: p.value,
      label: t(`priority.${p.value}`),
      icon: p.icon,
    }));
    return { statuses, priorities };
  }, [t, workflow]);
}
