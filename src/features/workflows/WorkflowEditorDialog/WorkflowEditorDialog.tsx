import { Alert, Box, Button, Typography } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/Icon';
import { SectionLabel } from '@/components/SectionLabel';
import { DialogBase, TextInput } from '@/components/ui';
import type { Workflow } from '@/data/types';
import { closestStatus } from '@/data/workflows';
import { useAppState, type WorkflowUsage } from '@/state/useAppState';
import { useSnackbar } from '@/state/useSnackbar';
import { MoveTicketsStep } from './components/MoveTicketsStep';
import { StatusRow } from './components/StatusRow';
import { useStatusDrafts } from './useStatusDrafts';

interface WorkflowEditorDialogProps {
  open: boolean;
  /** The workflow to edit, or null to create one. */
  workflow: Workflow | null;
  usage: WorkflowUsage | undefined;
  onClose: () => void;
}

/**
 * Create or edit a workflow: its name and its ordered statuses. Deleting statuses that still
 * have tickets leads to a second step asking where those tickets go. The draft starts from
 * `workflow` when mounted, so give it a new `key` each time it opens.
 */
export function WorkflowEditorDialog({
  open,
  workflow,
  usage,
  onClose,
}: WorkflowEditorDialogProps) {
  const { t } = useTranslation();
  const snack = useSnackbar();
  const { createWorkflow, updateWorkflow } = useAppState();
  const drafts = useStatusDrafts(workflow);
  const [name, setName] = useState(() => workflow?.name ?? t('settings.workflows.newName'));
  const [step, setStep] = useState<'edit' | 'move'>('edit');
  /** Deleted status id → key of the draft its tickets move to. */
  const [moves, setMoves] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const counts = usage?.ticketCounts ?? {};
  const projectCount = usage?.projectIds.length ?? 0;
  const valid = !!name.trim() && drafts.valid;

  /** Saved statuses that are being deleted while tickets still use them. */
  const stranded = (workflow?.statuses ?? []).filter(
    (s) => counts[s.id] && !drafts.rows.some((r) => r.id === s.id),
  );

  const save = async () => {
    if (!valid || saving) return;
    if (stranded.length && step === 'edit') {
      setMoves(
        Object.fromEntries(stranded.map((s) => [s.id, closestStatus(s.category, drafts.rows).key])),
      );
      setStep('move');
      return;
    }
    setSaving(true);
    try {
      if (workflow) {
        // Targets are drafts: saved ones by id, new ones by name (the service accepts both).
        const byKey = new Map(drafts.rows.map((r) => [r.key, r.id ?? r.name.trim()]));
        await updateWorkflow(workflow.id, {
          name: name.trim(),
          statuses: drafts.toInput(),
          moves: Object.fromEntries(stranded.map((s) => [s.id, byKey.get(moves[s.id])!])),
        });
      } else {
        await createWorkflow({ name: name.trim(), statuses: drafts.toInput() });
      }
      snack(t('settings.workflows.saved'), { severity: 'success' });
      onClose();
    } catch (err) {
      snack((err as Error).message, { severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const title =
    step === 'move'
      ? t('settings.workflows.moveTickets.title')
      : workflow
        ? t('settings.workflows.editor.titleEdit')
        : t('settings.workflows.editor.titleNew');

  return (
    <DialogBase
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      title={title}
      actions={
        <>
          {step === 'move' ? (
            <Button onClick={() => setStep('edit')}>{t('common.back')}</Button>
          ) : (
            <Button onClick={onClose}>{t('common.cancel')}</Button>
          )}
          <Button variant="contained" onClick={() => void save()} disabled={!valid || saving}>
            {step === 'move'
              ? t('settings.workflows.moveTickets.confirm')
              : workflow
                ? t('common.save')
                : t('settings.workflows.editor.create')}
          </Button>
        </>
      }
    >
      {step === 'move' ? (
        <MoveTicketsStep
          stranded={stranded}
          counts={counts}
          targets={drafts.rows}
          value={moves}
          onChange={setMoves}
        />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75, mt: 1 }}>
          <TextInput
            label={t('settings.workflows.editor.name')}
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={!name.trim()}
          />
          {projectCount > 1 && (
            <Alert severity="info" icon={<Icon name="info" size={20} />}>
              {t('settings.workflows.editor.sharedWarning', { count: projectCount })}
            </Alert>
          )}
          <Box>
            <SectionLabel>{t('settings.workflows.editor.statuses')}</SectionLabel>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.5, mb: 1 }}>
              {t('settings.workflows.editor.statusesHint')}
            </Typography>
            <Box role="list" aria-label={t('settings.workflows.editor.statuses')}>
              {drafts.rows.map((r) => (
                <Box role="listitem" key={r.key}>
                  <StatusRow
                    status={r}
                    tickets={r.id ? (counts[r.id] ?? 0) : 0}
                    error={drafts.errors[r.key]}
                    autoFocus={drafts.focusKey === r.key}
                    canRemove={drafts.rows.length > 1}
                    drag={drafts.drag}
                    onChange={(change) => drafts.patch(r.key, change)}
                    onRemove={() => drafts.remove(r.key)}
                    onMove={(delta) => drafts.shift(r.key, delta)}
                  />
                </Box>
              ))}
            </Box>
            <Button
              size="small"
              startIcon={<Icon name="add" size={18} />}
              onClick={drafts.add}
              sx={{ mt: 0.5 }}
            >
              {t('settings.workflows.editor.add')}
            </Button>
          </Box>
        </Box>
      )}
    </DialogBase>
  );
}
