import { Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { WorkflowStatus } from '@/data/types';
import { StatusMappingList } from '../../StatusMappingList';
import type { StatusDraft } from '../useStatusDrafts';

interface MoveTicketsStepProps {
  /** Deleted statuses that still have tickets. */
  stranded: WorkflowStatus[];
  /** Tickets per status id. */
  counts: Record<string, number>;
  /** The statuses that stay (drafts, since new ones have no id yet). */
  targets: StatusDraft[];
  /** Deleted status id → key of the draft its tickets move to. */
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}

/** Second step of the workflow editor: where the tickets of deleted statuses go. */
export function MoveTicketsStep({
  stranded,
  counts,
  targets,
  value,
  onChange,
}: MoveTicketsStepProps) {
  const { t } = useTranslation();
  return (
    <>
      <Typography sx={{ fontSize: 14, color: 'text.secondary', mb: 2 }}>
        {t('settings.workflows.moveTickets.message')}
      </Typography>
      <StatusMappingList
        rows={stranded.map((s) => ({ key: s.id, status: s, count: counts[s.id] }))}
        targets={targets.map((r) => ({ value: r.key, label: r.name.trim(), icon: r.icon }))}
        value={value}
        onChange={onChange}
      />
    </>
  );
}
