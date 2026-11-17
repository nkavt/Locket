import { Button, Divider } from '@mui/material';
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsCard } from './SettingsCard';
import { WorkflowRow } from './WorkflowRow';
import { Icon } from '@/components/Icon';
import { workflowDeleteBlocker, type DeleteBlocker } from '@/data/workflows';
import { WorkflowEditorDialog } from '@/features/workflows/WorkflowEditorDialog';
import { useAppState, useProjects, useWorkflowUsage } from '@/state/useAppState';

/** Settings → Workflows: the shared status sets, and a button to create one. */
export function WorkflowsCard() {
  const { t } = useTranslation();
  const { state } = useAppState();
  const projects = useProjects();
  const usage = useWorkflowUsage();
  const [creating, setCreating] = useState(false);
  /** Bumped on every open so the editor starts a fresh draft. */
  const [session, setSession] = useState(0);

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? id;
  const blockerText: Record<DeleteBlocker, string> = {
    default: t('settings.workflows.deleteDefault'),
    in_use: t('settings.workflows.deleteInUse'),
  };

  return (
    <SettingsCard
      title={t('settings.workflows.title')}
      subtitle={t('settings.workflows.subtitle')}
      action={
        <Button
          size="small"
          variant="outlined"
          startIcon={<Icon name="add" size={18} />}
          onClick={() => {
            setSession((n) => n + 1);
            setCreating(true);
          }}
        >
          {t('settings.workflows.new')}
        </Button>
      }
    >
      {state.workflows.map((w, i) => {
        const used = usage[w.id]?.projectIds ?? [];
        const blocker = workflowDeleteBlocker(w.id, used);
        return (
          <Fragment key={w.id}>
            {i > 0 && <Divider />}
            <WorkflowRow
              workflow={w}
              usedBy={used.map(projectName)}
              usage={usage[w.id]}
              deleteBlocked={blocker && blockerText[blocker]}
            />
          </Fragment>
        );
      })}

      <WorkflowEditorDialog
        key={session}
        open={creating}
        workflow={null}
        usage={undefined}
        onClose={() => setCreating(false)}
      />
    </SettingsCard>
  );
}
