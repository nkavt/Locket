import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ProjectAvatar } from '@/components/ProjectAvatar';
import { monoFontFamily } from '@/theme';
import { findStatus } from '@/data/workflows';
import type { Project, StatusCategory, Ticket, Workflow } from '@/data/types';

interface TicketListHeaderProps {
  project: Project;
  workflow: Workflow;
  tickets: Ticket[];
  action?: ReactNode;
}

export function TicketListHeader({ project, workflow, tickets, action }: TicketListHeaderProps) {
  const { t } = useTranslation();
  // Progress reads categories: cancelled tickets are closed but count neither way.
  const count = (category: StatusCategory) =>
    tickets.filter((x) => findStatus(workflow, x.status)?.category === category).length;
  const done = count('done');
  const cancelled = count('cancelled');
  return (
    <Box sx={{ p: '20px 28px 14px', borderBottom: 1, borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.75 }}>
        <ProjectAvatar project={project} size={40} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
            <Typography
              component="h1"
              sx={{ m: 0, fontSize: 20, fontWeight: 500, whiteSpace: 'nowrap' }}
            >
              {project.name}
            </Typography>
            <Box
              sx={{
                fontSize: 11,
                color: 'text.disabled',
                bgcolor: 'action.hover',
                padding: '2px 7px',
                borderRadius: '4px',
                fontFamily: monoFontFamily,
              }}
            >
              {project.slug}
            </Box>
          </Box>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.5 }}>
            {t('tickets.ticketCount', { count: tickets.length - cancelled })} ·{' '}
            {t('tickets.doneCount', { count: done })}
            {cancelled > 0 && <> · {t('tickets.cancelledCount', { count: cancelled })}</>}
          </Typography>
        </Box>
        {action}
      </Box>
    </Box>
  );
}
