import { Button, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DialogBase } from '@/components/ui';
import type { Project } from '@/data/types';
import { countByStatus, mapByCategory, workflowOf } from '@/data/workflows';
import { useProjectTickets, useWorkflows } from '@/state/useAppState';
import { StatusMappingList } from './StatusMappingList';

interface SwitchWorkflowDialogProps {
  project: Project;
  /** The workflow the project is switching to. */
  toWorkflowId: string;
  onClose: () => void;
  /** Old status id → new status id, for every status that has tickets. */
  onConfirm: (statusMap: Record<string, string>) => void;
}

/**
 * Review step before a project changes workflow: where its tickets end up, status by status.
 * Mount it only while reviewing; the suggested mapping is worked out when it mounts.
 */
export function SwitchWorkflowDialog({
  project,
  toWorkflowId,
  onClose,
  onConfirm,
}: SwitchWorkflowDialogProps) {
  const { t } = useTranslation();
  const workflows = useWorkflows();
  const tickets = useProjectTickets(project.id);
  const from = workflowOf(workflows, project.workflowId);
  const to = workflowOf(workflows, toWorkflowId);
  const counts = useMemo(() => countByStatus(tickets), [tickets]);
  const used = from.statuses.filter((s) => counts[s.id]);
  const [map, setMap] = useState(() => mapByCategory(from, to));

  return (
    <DialogBase
      open
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      title={t('projects.switchWorkflow.title', { workflow: to.name })}
      actions={
        <>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            onClick={() => onConfirm(Object.fromEntries(used.map((s) => [s.id, map[s.id]])))}
          >
            {t('projects.switchWorkflow.confirm')}
          </Button>
        </>
      }
    >
      <Typography sx={{ fontSize: 14, color: 'text.secondary', mb: 2 }}>
        {t('projects.switchWorkflow.message')}
      </Typography>
      <StatusMappingList
        rows={used.map((s) => ({ key: s.id, status: s, count: counts[s.id] }))}
        targets={to.statuses.map((s) => ({ value: s.id, label: s.name, icon: s.icon }))}
        value={map}
        onChange={setMap}
      />
    </DialogBase>
  );
}
