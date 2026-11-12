import { Box, Button } from '@mui/material';
import { useEffect, useRef } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/Icon';
import {
  DialogBase,
  FieldLabel,
  OptionButton,
  SelectInput,
  TextInput,
  TextareaInput,
} from '@/components/ui';
import { LABEL_PALETTE } from '@/data/constants';
import { useTicketOptions } from './useTicketOptions';
import { AttachmentGrid } from '@/features/attachments/AttachmentGrid';
import { usePendingAttachments } from '@/features/attachments/usePendingAttachments';
import { useAppState } from '@/state/useAppState';
import { useSnackbar } from '@/state/useSnackbar';
import { monoFontFamily } from '@/theme';
import type { PriorityValue, Project, StatusValue, Ticket } from '@/data/types';

interface NewTicketDialogProps {
  open: boolean;
  project: Project;
  onClose: () => void;
  /** Called after the ticket has been added to the store. */
  onCreated?: (t: Ticket) => void;
}

interface TicketFormValues {
  title: string;
  description: string;
  status: StatusValue;
  priority: PriorityValue;
  labels: string[];
  due: string;
}

const DEFAULTS: TicketFormValues = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  labels: [],
  due: '',
};

export function NewTicketDialog({ open, project, onClose, onCreated }: NewTicketDialogProps) {
  const { t } = useTranslation();
  const { addTicket } = useAppState();
  const { statuses, priorities } = useTicketOptions();
  const {
    register,
    control,
    handleSubmit,
    reset,

    setValue,
    formState: { isValid },
  } = useForm<TicketFormValues>({ mode: 'onChange', defaultValues: DEFAULTS });
  const snack = useSnackbar();

  const description = useWatch({ control, name: 'description' });
  const descriptionEl = useRef<HTMLTextAreaElement | null>(null);
  const { ref: descriptionRef, ...descriptionField } = register('description');
  const images = usePendingAttachments(
    description,
    (v) => setValue('description', v, { shouldDirty: true }),
    descriptionEl,
  );
  const resetImages = images.reset;

  useEffect(() => {
    if (!open) return;
    reset(DEFAULTS);
    resetImages();
    // Only on open: resetImages changes identity with every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset]);

  const submit = handleSubmit(async (v) => {
    let created: Ticket;
    try {
      created = await addTicket(project.id, {
        title: v.title.trim(),
        description: v.description,
        status: v.status,
        priority: v.priority,
        labels: v.labels,
        due: v.due || null,
        attachments: images.toSave(),
      });
    } catch (err) {
      snack(t('attachments.failed', { message: (err as Error).message }), { severity: 'error' });
      return;
    }
    images.reset();
    onClose();
    onCreated?.(created);
  });

  return (
    <DialogBase
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      title={
        <>
          {t('tickets.newTicket')}
          <Box
            component="span"
            sx={{
              fontFamily: monoFontFamily,
              fontSize: 12,
              color: 'text.disabled',
              ml: 1,
              fontWeight: 400,
            }}
          >
            {t('tickets.newTicketIn', { project: project.name })}
          </Box>
        </>
      }
      actions={
        <>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            startIcon={<Icon name="add" size={18} />}
            onClick={submit}
            disabled={!isValid}
          >
            {t('tickets.createTicket')}
          </Button>
        </>
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75, mt: 1 }}>
        <TextInput
          label={t('tickets.form.title')}
          autoFocus
          {...register('title', { validate: (v) => v.trim().length > 0 })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
          }}
        />
        <Box
          {...images.dropProps}
          sx={{
            borderRadius: 1,
            outline: images.dragging ? '2px dashed' : 'none',
            outlineColor: 'primary.main',
            outlineOffset: 2,
          }}
        >
          <TextareaInput
            label={t('tickets.form.description')}
            rows={6}
            placeholder={
              images.dragging ? t('attachments.dropHere') : t('tickets.form.descriptionPlaceholder')
            }
            {...descriptionField}
            ref={(el: HTMLTextAreaElement | null) => {
              descriptionRef(el);
              descriptionEl.current = el;
            }}
            onPaste={images.onPaste}
            {...images.caretProps}
          />
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mt: 1 }}>
            <Box sx={{ flex: 1 }}>
              <AttachmentGrid size="small" {...images.grid} />
            </Box>
            <Button
              size="small"
              startIcon={<Icon name="add_photo_alternate" size={18} />}
              onClick={images.pick}
            >
              {t('attachments.attach')}
            </Button>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 140px' }}>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <SelectInput<StatusValue>
                  fullWidth
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value as StatusValue)}
                  options={statuses}
                />
              )}
            />
          </Box>
          <Box sx={{ flex: '1 1 140px' }}>
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <SelectInput<PriorityValue>
                  fullWidth
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value as PriorityValue)}
                  options={priorities}
                />
              )}
            />
          </Box>
          <Box sx={{ flex: '1 1 140px' }}>
            <TextInput
              size="small"
              label={t('tickets.form.dueDate')}
              type="date"
              slotProps={{ inputLabel: { shrink: true } }}
              {...register('due')}
            />
          </Box>
        </Box>
        <Box>
          <FieldLabel>{t('tickets.form.labels')}</FieldLabel>
          <Controller
            name="labels"
            control={control}
            render={({ field }) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.625 }}>
                {LABEL_PALETTE.map((l) => {
                  const on = field.value.includes(l.name);
                  return (
                    <OptionButton
                      key={l.name}
                      shape="pill"
                      selected={on}
                      color={l.color}
                      onClick={() =>
                        field.onChange(
                          on ? field.value.filter((x) => x !== l.name) : [...field.value, l.name],
                        )
                      }
                    >
                      {l.name}
                    </OptionButton>
                  );
                })}
              </Box>
            )}
          />
        </Box>
      </Box>
    </DialogBase>
  );
}
