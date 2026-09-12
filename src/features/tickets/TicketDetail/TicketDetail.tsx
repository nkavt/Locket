import { Box } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { TicketHeader } from './components/TicketHeader';
import { TitleEditor } from './components/TitleEditor';
import { TicketMetaRow } from './components/TicketMetaRow';
import { LabelPicker } from './components/LabelPicker';
import { DescriptionEditor } from './components/DescriptionEditor';
import { CommentsThread } from '@/features/comments/CommentsThread';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { projectPath } from '@/router';
import { useAppState } from '@/state/useAppState';
import type { Project, Ticket } from '@/data/types';

interface TicketDetailProps {
  ticket: Ticket;
  project: Project;
}

export function TicketDetail({ ticket, project }: TicketDetailProps) {
  const { updateTicket, deleteTicket } = useAppState();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const update = (patch: Partial<Ticket>) => updateTicket(ticket.id, patch);
  const backToProject = () => navigate(projectPath(project.id));

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'background.default',
      }}
    >
      <TicketHeader
        ticket={ticket}
        project={project}
        onBack={backToProject}
        onDelete={() => setConfirmDelete(true)}
      />

      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        <Box sx={{ maxWidth: 920, mx: 'auto', padding: '24px 32px 60px' }}>
          <TitleEditor value={ticket.title} onSave={(title) => update({ title })} />
          <TicketMetaRow ticket={ticket} onUpdate={update} />
          <LabelPicker value={ticket.labels || []} onChange={(labels) => update({ labels })} />
          <DescriptionEditor
            value={ticket.description || ''}
            onSave={(description) => update({ description })}
          />
          <CommentsThread ticket={ticket} />
        </Box>
      </Box>

      <ConfirmDialog
        open={confirmDelete}
        title={t('tickets.detail.deleteConfirm.title')}
        message={t('tickets.detail.deleteConfirm.message', { title: ticket.title })}
        confirmLabel={t('common.delete')}
        danger
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteTicket(ticket.id);
          backToProject();
        }}
      />
    </Box>
  );
}
