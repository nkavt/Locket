import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Icon } from '@/components/Icon';
import { StatusIcon } from '@/components/StatusIcon';
import type { Workflow } from '@/data/types';
import { WorkflowEditorDialog } from '@/features/workflows/WorkflowEditorDialog';
import { useAppState, type WorkflowUsage } from '@/state/useAppState';
import { useSnackbar } from '@/state/useSnackbar';

interface WorkflowRowProps {
  workflow: Workflow;
  /** Names of the projects using it. */
  usedBy: string[];
  /** Projects and ticket counts, for the editor. */
  usage: WorkflowUsage | undefined;
  /** Why it can't be deleted, or null when it can. */
  deleteBlocked: string | null;
}

/** One workflow in Settings: its statuses and who uses it, with edit, duplicate and delete. */
export function WorkflowRow({ workflow, usedBy, usage, deleteBlocked }: WorkflowRowProps) {
  const { t } = useTranslation();
  const snack = useSnackbar();
  const { createWorkflow, deleteWorkflow } = useAppState();
  const [editing, setEditing] = useState(false);
  /** Bumped on every open so the editor starts a fresh draft. */
  const [session, setSession] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const run = async (work: () => Promise<unknown>, done: string) => {
    try {
      await work();
      snack(done, { severity: 'success' });
    } catch (err) {
      snack((err as Error).message, { severity: 'error' });
    }
  };

  const edit = () => {
    setSession((n) => n + 1);
    setEditing(true);
  };
  const duplicate = () =>
    run(
      () =>
        createWorkflow({
          name: t('settings.workflows.copyName', { name: workflow.name }),
          copyFrom: workflow.id,
        }),
      t('settings.workflows.duplicated'),
    );
  const remove = () => run(() => deleteWorkflow(workflow.id), t('settings.workflows.deleted'));

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 500 }}>{workflow.name}</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 1.5, rowGap: 0.5, mt: 0.75 }}>
          {workflow.statuses.map((s) => (
            <Box
              key={s.id}
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: 12.5 }}
            >
              <StatusIcon status={s} size={15} />
              {s.name}
            </Box>
          ))}
        </Box>
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.75 }}>
          {usedBy.length
            ? t('settings.workflows.usedBy', { count: usedBy.length, names: usedBy.join(', ') })
            : t('settings.workflows.unused')}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Tooltip title={t('settings.workflows.edit')}>
          <IconButton
            size="small"
            aria-label={`${t('settings.workflows.edit')}: ${workflow.name}`}
            onClick={edit}
          >
            <Icon name="edit" size={18} />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('settings.workflows.duplicate')}>
          <IconButton
            size="small"
            aria-label={`${t('settings.workflows.duplicate')}: ${workflow.name}`}
            onClick={() => void duplicate()}
          >
            <Icon name="content_copy" size={18} />
          </IconButton>
        </Tooltip>
        <Tooltip title={deleteBlocked ?? t('settings.workflows.delete')}>
          <span>
            <IconButton
              size="small"
              aria-label={`${t('settings.workflows.delete')}: ${workflow.name}`}
              disabled={!!deleteBlocked}
              onClick={() => setConfirmDelete(true)}
            >
              <Icon name="delete_outline" size={18} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <WorkflowEditorDialog
        key={session}
        open={editing}
        workflow={workflow}
        usage={usage}
        onClose={() => setEditing(false)}
      />
      <ConfirmDialog
        open={confirmDelete}
        title={t('settings.workflows.deleteConfirm.title')}
        message={t('settings.workflows.deleteConfirm.message', { name: workflow.name })}
        confirmLabel={t('common.delete')}
        danger
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void remove()}
      />
    </Box>
  );
}
