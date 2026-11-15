import { Alert, Box, Button, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/Icon';
import { SectionLabel } from '@/components/SectionLabel';
import { DialogBase, TextInput } from '@/components/ui';
import type { Workflow } from '@/data/types';
import { DEFAULT_STATUS_COLOR, DEFAULT_STATUS_ICON, DEFAULT_WORKFLOW } from '@/data/workflows';
import { useAppState, type WorkflowUsage } from '@/state/useAppState';
import { useSnackbar } from '@/state/useSnackbar';
import { StatusMappingList } from '../StatusMappingList';
import { StatusRow, type StatusDraft } from './components/StatusRow';

interface WorkflowEditorDialogProps {
  open: boolean;
  /** The workflow to edit, or null to create one. */
  workflow: Workflow | null;
  usage: WorkflowUsage | undefined;
  onClose: () => void;
}

let draftKey = 0;
const nextKey = () => `draft-${++draftKey}`;

const toDrafts = (w: Workflow | null): StatusDraft[] =>
  (w?.statuses ?? DEFAULT_WORKFLOW.statuses).map((s) => ({
    key: nextKey(),
    // A new workflow copies the default statuses' look but gets its own ids on save.
    ...(w ? s : { ...s, id: undefined }),
  }));

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
  const [name, setName] = useState(() => workflow?.name ?? t('settings.workflows.newName'));
  const [rows, setRows] = useState(() => toDrafts(workflow));
  const [step, setStep] = useState<'edit' | 'move'>('edit');
  /** Deleted status id → key of the row its tickets move to. */
  const [moves, setMoves] = useState<Record<string, string>>({});
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /** A just-added row, whose name field takes focus. */
  const [focusKey, setFocusKey] = useState<string | null>(null);

  const counts = usage?.ticketCounts ?? {};
  const projectCount = usage?.projectIds.length ?? 0;

  const errors = useMemo(() => {
    const out: Record<string, string> = {};
    const seen = new Set<string>();
    for (const r of rows) {
      const key = r.name.trim().toLowerCase();
      if (!key) out[r.key] = t('settings.workflows.editor.blankName');
      else if (seen.has(key))
        out[r.key] = t('settings.workflows.editor.duplicateName', { name: r.name.trim() });
      seen.add(key);
    }
    return out;
  }, [rows, t]);
  const valid = !!name.trim() && rows.length > 0 && Object.keys(errors).length === 0;

  /** Saved statuses that are being deleted while tickets still use them. */
  const stranded = (workflow?.statuses ?? []).filter(
    (s) => counts[s.id] && !rows.some((r) => r.id === s.id),
  );

  const patchRow = (key: string, patch: Partial<StatusDraft>) =>
    setRows((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const moveRow = (from: number, to: number) =>
    setRows((list) => {
      if (to < 0 || to >= list.length || from === to) return list;
      const next = [...list];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });

  const addRow = () => {
    const key = nextKey();
    setFocusKey(key);
    setRows((list) => [
      ...list,
      {
        key,
        name: '',
        icon: DEFAULT_STATUS_ICON,
        color: DEFAULT_STATUS_COLOR,
        category: 'todo',
      },
    ]);
  };

  const save = async () => {
    if (!valid || saving) return;
    if (stranded.length && step === 'edit') {
      // Suggest the first remaining status of the same category, else the first one.
      setMoves(
        Object.fromEntries(
          stranded.map((s) => [s.id, (rows.find((r) => r.category === s.category) ?? rows[0]).key]),
        ),
      );
      setStep('move');
      return;
    }
    const statuses = rows.map((r) => ({
      id: r.id,
      name: r.name.trim(),
      icon: r.icon,
      color: r.color,
      category: r.category,
    }));
    setSaving(true);
    try {
      if (workflow) {
        // Targets are rows: saved ones by id, new ones by name (the service accepts both).
        const byKey = new Map(rows.map((r) => [r.key, r.id ?? r.name.trim()]));
        await updateWorkflow(workflow.id, {
          name: name.trim(),
          statuses,
          moves: Object.fromEntries(stranded.map((s) => [s.id, byKey.get(moves[s.id])!])),
        });
      } else {
        await createWorkflow({ name: name.trim(), statuses });
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
        <>
          <Typography sx={{ fontSize: 14, color: 'text.secondary', mb: 2 }}>
            {t('settings.workflows.moveTickets.message')}
          </Typography>
          <StatusMappingList
            rows={stranded.map((s) => ({ key: s.id, status: s, count: counts[s.id] }))}
            targets={rows.map((r) => ({ value: r.key, label: r.name.trim(), icon: r.icon }))}
            value={moves}
            onChange={setMoves}
          />
        </>
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
              {rows.map((r, i) => (
                <Box role="listitem" key={r.key}>
                  <StatusRow
                    status={r}
                    tickets={r.id ? (counts[r.id] ?? 0) : 0}
                    error={errors[r.key]}
                    autoFocus={focusKey === r.key}
                    canRemove={rows.length > 1}
                    dragging={dragKey === r.key}
                    onChange={(patch) => patchRow(r.key, patch)}
                    onRemove={() => setRows((list) => list.filter((x) => x.key !== r.key))}
                    onMove={(delta) => moveRow(i, i + delta)}
                    dragProps={{
                      onDragStart: (e) => {
                        e.dataTransfer.effectAllowed = 'move';
                        setDragKey(r.key);
                      },
                      // Reorder live as the dragged row passes over others.
                      onDragEnter: () => {
                        if (!dragKey || dragKey === r.key) return;
                        moveRow(
                          rows.findIndex((x) => x.key === dragKey),
                          i,
                        );
                      },
                      onDragOver: (e) => {
                        if (dragKey) e.preventDefault();
                      },
                      onDragEnd: () => setDragKey(null),
                    }}
                  />
                </Box>
              ))}
            </Box>
            <Button
              size="small"
              startIcon={<Icon name="add" size={18} />}
              onClick={addRow}
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
