import { Box, Typography } from '@mui/material';
import { useRef, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/Icon';
import { SelectInput } from '@/components/ui';
import { useTicketOptions } from '../../useTicketOptions';
import { formatDate, relativeTime } from '@/utils/format';
import type { PriorityValue, StatusValue, Ticket } from '@/data/types';

interface TicketMetaRowProps {
  ticket: Ticket;
  onUpdate: (patch: Partial<Ticket>) => void;
}

export function TicketMetaRow({ ticket, onUpdate }: TicketMetaRowProps) {
  const { t } = useTranslation();
  const { statuses, priorities } = useTicketOptions();
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', marginTop: 1.75 }}>
      <SelectInput<StatusValue>
        value={ticket.status}
        onChange={(e) => onUpdate({ status: e.target.value as StatusValue })}
        options={statuses}
      />
      <SelectInput<PriorityValue>
        value={ticket.priority}
        onChange={(e) => onUpdate({ priority: e.target.value as PriorityValue })}
        options={priorities}
      />
      <DueDateButton value={ticket.due} onChange={(due) => onUpdate({ due })} />
      <Box sx={{ flex: 1 }} />
      <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>
        {t('tickets.detail.updatedBy', {
          time: relativeTime(ticket.updated),
          author: ticket.author,
        })}
      </Typography>
    </Box>
  );
}

interface DueDateButtonProps {
  value: string | null;
  onChange: (due: string | null) => void;
}

function DueDateButton({ value, onChange }: DueDateButtonProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLInputElement>(null);
  return (
    <Box
      component="button"
      type="button"
      onClick={() => ref.current?.showPicker?.() || ref.current?.focus()}
      sx={{
        position: 'relative',
        background: 'action.hover',
        border: 1,
        borderColor: 'divider',
        borderRadius: '4px',
        padding: '6px 10px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 13,
        color: value ? 'text.primary' : 'text.disabled',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        height: 30,
      }}
    >
      <Icon name="event" size={16} sx={{ color: 'text.secondary' }} />
      {value ? formatDate(value) : t('tickets.detail.noDueDate')}
      <Box
        component="input"
        ref={ref}
        type="date"
        aria-label={t('tickets.form.dueDate')}
        value={value || ''}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value || null)}
        sx={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
      />
    </Box>
  );
}
