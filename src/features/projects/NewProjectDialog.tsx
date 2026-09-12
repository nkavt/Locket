import { Box, Button } from '@mui/material';
import { useEffect, useRef } from 'react';
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
import { useAppState, useProjects } from '@/state/useAppState';
import { deriveSlug } from './utils';
import type { Project } from '@/data/types';

interface NewProjectDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called after the project has been added to the store. */
  onCreated?: (p: Project) => void;
}

interface ProjectFormValues {
  name: string;
  slug: string;
  icon: string;
  color: string;
  description: string;
}

const DEFAULTS: ProjectFormValues = {
  name: '',
  slug: '',
  icon: PROJECT_ICONS[0],
  color: PROJECT_COLORS[0],
  description: '',
};

const randomSuffix = () => Math.random().toString(36).slice(2, 6);

export function NewProjectDialog({ open, onClose, onCreated }: NewProjectDialogProps) {
  const { t } = useTranslation();
  const existing = useProjects();
  const { addProject } = useAppState();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isValid },
  } = useForm<ProjectFormValues>({ mode: 'onChange', defaultValues: DEFAULTS });

  const touchedSlugRef = useRef(false);

  useEffect(() => {
    if (open) {
      reset(DEFAULTS);
      touchedSlugRef.current = false;
    }
  }, [open, reset]);

  const name = useWatch({ control, name: 'name' });
  useEffect(() => {
    if (!touchedSlugRef.current) {
      setValue('slug', deriveSlug(name), { shouldValidate: true });
    }
  }, [name, setValue]);

  const slug = useWatch({ control, name: 'slug' });
  const color = useWatch({ control, name: 'color' });
  const slugExists = existing.some((p) => p.slug === slug);

  const slugReg = register('slug', {
    pattern: /^[a-z0-9-]{2,12}$/,
    validate: (v) => !existing.some((p) => p.slug === v) || t('projects.form.slugTaken'),
  });

  const submit = handleSubmit((v) => {
    const project: Project = {
      id: v.slug + '-' + randomSuffix(),
      name: v.name.trim(),
      slug: v.slug,
      icon: v.icon,
      color: v.color,
      description: v.description || `# ${v.name.trim()}\n\n`,
    };
    addProject(project);
    onClose();
    onCreated?.(project);
  });

  return (
    <DialogBase
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      title={t('projects.newProject')}
      actions={
        <>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={submit} disabled={!isValid}>
            {t('projects.form.create')}
          </Button>
        </>
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75, mt: 1 }}>
        <TextInput
          label={t('projects.form.name')}
          autoFocus
          placeholder={t('projects.form.namePlaceholder')}
          {...register('name', { validate: (v) => v.trim().length > 0 })}
        />
        <TextInput
          label={t('projects.form.slug')}
          {...slugReg}
          onChange={(e) => {
            touchedSlugRef.current = true;
            e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
            slugReg.onChange(e);
          }}
          helperText={
            slugExists
              ? t('projects.form.slugTaken')
              : t('projects.form.slugPreview', { slug: slug || t('projects.form.slugPlaceholder') })
          }
          error={!!errors.slug || (!!slug && slugExists)}
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
          label={t('projects.form.descriptionOptional')}
          rows={3}
          {...register('description')}
        />
      </Box>
    </DialogBase>
  );
}
