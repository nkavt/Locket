import { Box, Typography } from '@mui/material';
import { TicketRow } from './TicketRow';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/Icon';
import type { StatusOption, Ticket } from '@/data/types';

interface TicketGroupProps {
  status: StatusOption;
  tickets: Ticket[];
  onOpenTicket: (id: string) => void;
}

export function TicketGroup({ status, tickets, onOpenTicket }: TicketGroupProps) {
  const { t } = useTranslation();
  if (tickets.length === 0) return null;
  return (
    <Box sx={{ marginBottom: 2.25 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          padding: '8px 12px',
          color: 'text.secondary',
          whiteSpace: 'nowrap',
        }}
      >
        <Icon name={status.icon} size={16} sx={{ color: status.color }} />
        <Typography
          sx={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {t(`status.${status.value}`)}
        </Typography>
        <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>· {tickets.length}</Typography>
      </Box>
      <Box>
        {tickets.map((t) => (
          <TicketRow key={t.id} ticket={t} onClick={() => onOpenTicket(t.id)} />
        ))}
      </Box>
    </Box>
  );
}
