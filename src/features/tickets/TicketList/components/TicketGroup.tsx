import { Box, Typography } from '@mui/material';
import { TicketRow } from './TicketRow';
import { StatusIcon } from '@/components/StatusIcon';
import type { Ticket, WorkflowStatus } from '@/data/types';

interface TicketGroupProps {
  status: WorkflowStatus;
  tickets: Ticket[];
  onOpenTicket: (id: string) => void;
}

export function TicketGroup({ status, tickets, onOpenTicket }: TicketGroupProps) {
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
        <StatusIcon status={status} size={16} />
        <Typography
          sx={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {status.name}
        </Typography>
        <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>· {tickets.length}</Typography>
      </Box>
      <Box>
        {tickets.map((t) => (
          <TicketRow key={t.id} ticket={t} status={status} onClick={() => onOpenTicket(t.id)} />
        ))}
      </Box>
    </Box>
  );
}
