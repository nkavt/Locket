import { Box, Button } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  ColorPicker,
  DialogBase,
  FieldLabel,
  IconPicker,
  TextInput,
  TextareaInput,
} from '@/components/ui';
import { PROJECT_COLORS, PROJECT_ICONS } from '@/data/constants';
import { workflowOf } from '@/data/workflows';
import { SwitchWorkflowDialog } from '@/features/workflows/SwitchWorkflowDialog';
import { WorkflowSelect } from '@/features/workflows/WorkflowSelect';
import { useAppState, useProjectTickets, useWorkflows } from '@/state/useAppState';
import type { Project } from '@/data/types';

interface EditProjectDialogProps {
  open: boolean;
  project: Project | null;
  onClose: () => void;
}

interface EditFormValues {
  name: string;
  icon: string;
  color: string;
  description: string;
  workflowId: string;
}

/**
 * Edit name, icon, colour, description and workflow. The slug is immutable once created.
 * A new workflow with tickets to move asks where they go first (SwitchWorkflowDialog).
 */
export function EditProjectDialog({ open, project, onClose }: EditProjectDialogProps) {
  const { t } = useTranslation();
  const { updateProject } = useAppState();
  const workflows = useWorkflows();
  const tickets = useProjectTickets(project?.id);
  const ticketCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const x of tickets) counts[x.status] = (counts[x.status] ?? 0) + 1;
    return counts;
  }, [tickets]);
  /** Form values waiting for the switch review. */
  const [pending, setPending] = useState<EditFormValues | null>(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { isValid, isDirty },
  } = useForm<EditFormValues>({
    mode: 'onChange',
    defaultValues: {
      name: '',
      icon: PROJECT_ICONS[0],
      color: PROJECT_COLORS[0],
      description: '',
      workflowId: '',
    },
  });

  useEffect(() => {
    if (open && project) {
      reset({
        name: project.name,
        icon: project.icon,
        color: project.color,
        description: project.description,
        workflowId: project.workflowId,
      });
    }
  }, [open, project, reset]);

  const color = useWatch({ control, name: 'color' });

  const save = (v: EditFormValues, statusMap?: Record<string, string>) => {
    if (!project) return;
    void updateProject(
      project.id,
      {
        name: v.name.trim(),
        icon: v.icon,
        color: v.color,
        description: v.description,
        ...(v.workflowId !== project.workflowId && { workflowId: v.workflowId }),
      },
      { statusMap },
    );
    setPending(null);
    onClose();
  };

  const submit = handleSubmit((v) => {
    if (project && v.workflowId !== project.workflowId && tickets.length > 0) setPending(v);
    else save(v);
  });

  return (
    <DialogBase
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      title={t('projects.editProject')}
      actions={
        <>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={submit} disabled={!isValid || !isDirty}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75, mt: 1 }}>
        <TextInput
          label={t('projects.form.name')}
          autoFocus
          {...register('name', { validate: (v) => v.trim().length > 0 })}
        />
        <TextInput
          label={t('projects.form.slugReadonly')}
          value={project?.slug ?? ''}
          disabled
          helperText={t('projects.form.slugImmutable')}
        />
        <Box>
          <FieldLabel>{t('projects.form.icon')}</FieldLabel>
          <Controller
            name="icon"
            control={control}
            render={({ field }) => (
              <IconPicker
                value={field.value}
                onChange={field.onChange}
                suggestions={PROJECT_ICONS}
                color={color}
              />
            )}
          />
        </Box>
        <Box>
          <FieldLabel>{t('projects.form.color')}</FieldLabel>
          <Controller
            name="color"
            control={control}
            render={({ field }) => (
              <ColorPicker value={field.value} onChange={field.onChange} colors={PROJECT_COLORS} />
            )}
          />
        </Box>
        <Controller
          name="workflowId"
          control={control}
          render={({ field }) => (
            <WorkflowSelect ref={field.ref} value={field.value} onChange={field.onChange} />
          )}
        />
        <TextareaInput
          label={t('projects.form.description')}
          rows={3}
          {...register('description')}
        />
      </Box>
      {project && pending && (
        <SwitchWorkflowDialog
          open
          from={workflowOf(workflows, project.workflowId)}
          to={workflowOf(workflows, pending.workflowId)}
          ticketCounts={ticketCounts}
          onClose={() => setPending(null)}
          onConfirm={(statusMap) => save(pending, statusMap)}
        />
      )}
    </DialogBase>
  );
}
