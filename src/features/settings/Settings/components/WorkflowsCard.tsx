import { Box, Button, Divider, IconButton, Tooltip, Typography } from '@mui/material';
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsCard } from './SettingsCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Icon } from '@/components/Icon';
import { StatusIcon } from '@/components/StatusIcon';
import type { Workflow } from '@/data/types';
import { DEFAULT_WORKFLOW_ID } from '@/data/workflows';
import { WorkflowEditorDialog } from '@/features/workflows/WorkflowEditorDialog';
import { useAppState, useProjects, useWorkflowUsage } from '@/state/useAppState';
import { useSnackbar } from '@/state/useSnackbar';

/** Settings → Workflows: the shared status sets, with create, edit, duplicate and delete. */
export function WorkflowsCard() {
  const { t } = useTranslation();
  const snack = useSnackbar();
  const { state, createWorkflow, deleteWorkflow } = useAppState();
  const projects = useProjects();
  const usage = useWorkflowUsage();
  /** The workflow in the editor: null creates a new one, undefined means closed. */
  const [editing, setEditing] = useState<Workflow | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Workflow | null>(null);
  /** Bumped on every open so the editor starts a fresh draft. */
  const [session, setSession] = useState(0);
  const openEditor = (w: Workflow | null) => {
    setSession((n) => n + 1);
    setEditing(w);
  };

  const projectNames = (ids: string[]) =>
    ids.map((id) => projects.find((p) => p.id === id)?.name ?? id).join(', ');

  const run = async (work: () => Promise<unknown>, done: string) => {
    try {
      await work();
      snack(done, { severity: 'success' });
    } catch (err) {
      snack((err as Error).message, { severity: 'error' });
    }
  };

  const duplicate = (w: Workflow) =>
    run(
      () =>
        createWorkflow({
          name: t('settings.workflows.copyName', { name: w.name }),
          copyFrom: w.id,
        }),
      t('settings.workflows.duplicated'),
    );

  return (
    <SettingsCard
      title={t('settings.workflows.title')}
      subtitle={t('settings.workflows.subtitle')}
      action={
        <Button
          size="small"
          variant="outlined"
          startIcon={<Icon name="add" size={18} />}
          onClick={() => openEditor(null)}
        >
          {t('settings.workflows.new')}
        </Button>
      }
    >
      {state.workflows.map((w, i) => {
        const used = usage[w.id]?.projectIds ?? [];
        const deleteBlocked =
          w.id === DEFAULT_WORKFLOW_ID
            ? t('settings.workflows.deleteDefault')
            : used.length
              ? t('settings.workflows.deleteInUse')
              : null;
        return (
          <Fragment key={w.id}>
            {i > 0 && <Divider />}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 500 }}>{w.name}</Typography>
                <Box
                  sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 1.5, rowGap: 0.5, mt: 0.75 }}
                >
                  {w.statuses.map((s) => (
                    <Box
                      key={s.id}
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        fontSize: 12.5,
                      }}
                    >
                      <StatusIcon status={s} size={15} />
                      {s.name}
                    </Box>
                  ))}
                </Box>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.75 }}>
                  {used.length
                    ? t('settings.workflows.usedBy', {
                        count: used.length,
                        names: projectNames(used),
                      })
                    : t('settings.workflows.unused')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Tooltip title={t('settings.workflows.edit')}>
                  <IconButton
                    size="small"
                    aria-label={`${t('settings.workflows.edit')}: ${w.name}`}
                    onClick={() => openEditor(w)}
                  >
                    <Icon name="edit" size={18} />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('settings.workflows.duplicate')}>
                  <IconButton
                    size="small"
                    aria-label={`${t('settings.workflows.duplicate')}: ${w.name}`}
                    onClick={() => void duplicate(w)}
                  >
                    <Icon name="content_copy" size={18} />
                  </IconButton>
                </Tooltip>
                <Tooltip title={deleteBlocked ?? t('settings.workflows.delete')}>
                  <span>
                    <IconButton
                      size="small"
                      aria-label={`${t('settings.workflows.delete')}: ${w.name}`}
                      disabled={!!deleteBlocked}
                      onClick={() => setDeleting(w)}
                    >
                      <Icon name="delete_outline" size={18} />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Box>
          </Fragment>
        );
      })}

      <WorkflowEditorDialog
        key={session}
        open={editing !== undefined}
        workflow={editing ?? null}
        usage={editing ? usage[editing.id] : undefined}
        onClose={() => setEditing(undefined)}
      />
      <ConfirmDialog
        open={!!deleting}
        title={t('settings.workflows.deleteConfirm.title')}
        message={t('settings.workflows.deleteConfirm.message', { name: deleting?.name ?? '' })}
        confirmLabel={t('common.delete')}
        danger
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          const id = deleting!.id;
          void run(() => deleteWorkflow(id), t('settings.workflows.deleted'));
        }}
      />
    </SettingsCard>
  );
}
