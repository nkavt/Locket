import { Box, Button } from '@mui/material';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { TicketListHeader } from './components/TicketListHeader';
import { TicketFilters } from './components/TicketFilters';
import { TicketGroup } from './components/TicketGroup';
import { NewTicketDialog } from '../NewTicketDialog';
import { EMPTY_FILTERS, filterTickets, type TicketFilterState } from '../utils';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { STATUSES } from '@/data/constants';
import { ticketPath } from '@/router';
import { useProjectTickets } from '@/state/useAppState';
import type { Project, StatusValue, Ticket } from '@/data/types';

interface TicketListProps {
  project: Project;
}

export function TicketList({ project }: TicketListProps) {
  const tickets = useProjectTickets(project.id);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [filters, setFilters] = useState<TicketFilterState>(EMPTY_FILTERS);
  const [newOpen, setNewOpen] = useState(false);

  const filtered = useMemo(() => filterTickets(tickets, filters), [tickets, filters]);

  const grouped = useMemo(() => {
    const g: Record<StatusValue, Ticket[]> = { todo: [], in_progress: [], done: [] };
    filtered.forEach((t) => g[t.status]?.push(t));
    return g;
  }, [filtered]);

  const newTicketButton = (variant: 'contained' | 'outlined') => (
    <Button
      variant={variant}
      startIcon={<Icon name="add" size={18} />}
      onClick={() => setNewOpen(true)}
    >
      {t('tickets.newTicket')}
    </Button>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TicketListHeader project={project} tickets={tickets} action={newTicketButton('contained')} />
      <TicketFilters value={filters} onChange={setFilters} />

      <Box sx={{ flex: 1, overflowY: 'auto', padding: '12px 16px 40px' }}>
        {filtered.length === 0 ? (
          <EmptyState
            icon="inbox"
            title={tickets.length === 0 ? t('tickets.empty.none') : t('tickets.empty.noMatch')}
            action={newTicketButton('outlined')}
          />
        ) : (
          STATUSES.map((s) => (
            <TicketGroup
              key={s.value}
              status={s}
              tickets={grouped[s.value]}
              onOpenTicket={(id) => navigate(ticketPath(project.id, id))}
            />
          ))
        )}
      </Box>

      <NewTicketDialog
        open={newOpen}
        project={project}
        onClose={() => setNewOpen(false)}
        onCreated={(t) => navigate(ticketPath(project.id, t.id))}
      />
    </Box>
  );
}
