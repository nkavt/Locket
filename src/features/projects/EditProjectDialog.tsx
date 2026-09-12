import { Box, Button } from '@mui/material';
import { useEffect } from 'react';
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
import { useAppState } from '@/state/useAppState';
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
}

/** Edit name, icon, colour and description. The slug is immutable once created. */
export function EditProjectDialog({ open, project, onClose }: EditProjectDialogProps) {
  const { t } = useTranslation();
  const { updateProject } = useAppState();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { isValid, isDirty },
  } = useForm<EditFormValues>({
    mode: 'onChange',
    defaultValues: { name: '', icon: PROJECT_ICONS[0], color: PROJECT_COLORS[0], description: '' },
  });

  useEffect(() => {
    if (open && project) {
      reset({
        name: project.name,
        icon: project.icon,
        color: project.color,
        description: project.description,
      });
    }
  }, [open, project, reset]);

  const color = useWatch({ control, name: 'color' });

  const submit = handleSubmit((v) => {
    if (!project) return;
    updateProject(project.id, {
      name: v.name.trim(),
      icon: v.icon,
      color: v.color,
      description: v.description,
    });
    onClose();
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
                icons={PROJECT_ICONS}
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
        <TextareaInput
          label={t('projects.form.description')}
          rows={3}
          {...register('description')}
        />
      </Box>
    </DialogBase>
  );
}
