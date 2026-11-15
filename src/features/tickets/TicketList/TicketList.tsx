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
import { defaultStatus, findStatus } from '@/data/workflows';
import { ticketPath } from '@/router';
import { useProjectTickets, useProjectWorkflow } from '@/state/useAppState';
import type { Project, Ticket } from '@/data/types';

interface TicketListProps {
  project: Project;
}

export function TicketList({ project }: TicketListProps) {
  const tickets = useProjectTickets(project.id);
  const workflow = useProjectWorkflow(project);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [filters, setFilters] = useState<TicketFilterState>(EMPTY_FILTERS);
  const [newOpen, setNewOpen] = useState(false);

  const filtered = useMemo(() => filterTickets(tickets, filters), [tickets, filters]);

  // Groups follow the workflow's order. A status the workflow doesn't know (only possible
  // mid-sync) shows under the default one rather than disappearing.
  const grouped = useMemo(() => {
    const g = new Map<string, Ticket[]>(workflow.statuses.map((s) => [s.id, []]));
    const fallback = defaultStatus(workflow).id;
    filtered.forEach((t) => g.get(findStatus(workflow, t.status) ? t.status : fallback)!.push(t));
    return g;
  }, [filtered, workflow]);

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
      <TicketListHeader
        project={project}
        workflow={workflow}
        tickets={tickets}
        action={newTicketButton('contained')}
      />
      <TicketFilters workflow={workflow} value={filters} onChange={setFilters} />

      <Box sx={{ flex: 1, overflowY: 'auto', padding: '12px 16px 40px' }}>
        {filtered.length === 0 ? (
          <EmptyState
            icon="inbox"
            title={tickets.length === 0 ? t('tickets.empty.none') : t('tickets.empty.noMatch')}
            action={newTicketButton('outlined')}
          />
        ) : (
          workflow.statuses.map((s) => (
            <TicketGroup
              key={s.id}
              status={s}
              tickets={grouped.get(s.id) ?? []}
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
