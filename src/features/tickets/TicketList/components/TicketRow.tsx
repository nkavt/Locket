import { Box } from '@mui/material';
import { Icon } from '@/components/Icon';
import { LabelChip } from '@/components/LabelChip';
import { StatusIcon } from '@/components/StatusIcon';
import { PRIORITIES } from '@/data/constants';
import { monoFontFamily } from '@/theme';
import { formatDate } from '@/utils/format';
import { isOverdue } from '../../utils';
import type { Ticket } from '@/data/types';

interface TicketRowProps {
  ticket: Ticket;
  onClick: () => void;
}

export function TicketRow({ ticket, onClick }: TicketRowProps) {
  const priority = PRIORITIES.find((p) => p.value === ticket.priority);
  const overdue = isOverdue(ticket);

  return (
    <Box
      role="button"
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        padding: '10px 12px',
        borderRadius: '6px',
        cursor: 'pointer',
        animation: 'slideIn 0.18s ease-out',
        '&:hover': { background: 'action.hover' },
      }}
    >
      <StatusIcon status={ticket.status} />
      <Box
        sx={{
          fontFamily: monoFontFamily,
          fontSize: 11,
          color: 'text.disabled',
          minWidth: 64,
          flexShrink: 0,
        }}
      >
        {ticket.id}
      </Box>
      <Box
        sx={{
          flex: 1,
          fontSize: 14,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {ticket.title}
      </Box>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {(ticket.labels || []).slice(0, 3).map((l) => (
          <LabelChip key={l} label={l} size="sm" />
        ))}
      </Box>
      {priority && priority.value !== 'medium' && (
        <Icon
          name={priority.icon}
          size={14}
          sx={{ color: priority.value === 'high' ? 'error.main' : 'text.disabled' }}
        />
      )}
      {ticket.due && (
        <Box
          sx={{
            fontSize: 11.5,
            color: overdue ? 'error.main' : 'text.disabled',
            minWidth: 56,
            textAlign: 'right',
          }}
        >
          {formatDate(ticket.due)}
        </Box>
      )}
      {ticket.comments?.length > 0 && (
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.375,
            fontSize: 11,
            color: 'text.disabled',
            minWidth: 28,
          }}
        >
          <Icon name="chat_bubble_outline" size={13} />
          {ticket.comments.length}
        </Box>
      )}
    </Box>
  );
}
