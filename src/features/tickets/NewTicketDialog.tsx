import { Box, Button } from '@mui/material';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
import { useAppState } from '@/state/useAppState';
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
    formState: { isValid },
  } = useForm<TicketFormValues>({ mode: 'onChange', defaultValues: DEFAULTS });

  useEffect(() => {
    if (open) reset(DEFAULTS);
  }, [open, reset]);

  const submit = handleSubmit((v) => {
    const created = addTicket(project.id, {
      title: v.title.trim(),
      description: v.description,
      status: v.status,
      priority: v.priority,
      labels: v.labels,
      due: v.due || null,
    });
    onClose();
    if (created) onCreated?.(created);
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
        <TextareaInput
          label={t('tickets.form.description')}
          rows={6}
          placeholder={t('tickets.form.descriptionPlaceholder')}
          {...register('description')}
        />
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
