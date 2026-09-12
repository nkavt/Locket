import {
  Box,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/Icon';
import { useSnackbar } from '@/state/useSnackbar';
import { monoFontFamily } from '@/theme';
import type { Project, Ticket } from '@/data/types';

interface TicketHeaderProps {
  ticket: Ticket;
  project: Project;
  onBack: () => void;
  onDelete: () => void;
}

export function TicketHeader({ ticket, project, onBack, onDelete }: TicketHeaderProps) {
  const [moreMenu, setMoreMenu] = useState<HTMLElement | null>(null);
  const snack = useSnackbar();
  const { t } = useTranslation();

  const copyLink = () => {
    void navigator.clipboard?.writeText(`locket://${ticket.id}`);
    snack(t('tickets.detail.linkCopied'));
  };

  return (
    <Box
      sx={{
        padding: '12px 24px',
        borderBottom: 1,
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        background: 'background.paper',
      }}
    >
      <IconButton onClick={onBack} title={t('common.back')}>
        <Icon name="arrow_back" size={20} />
      </IconButton>
      <Box sx={{ fontFamily: monoFontFamily, fontSize: 12, color: 'text.disabled' }}>
        <Box component="span" sx={{ color: project.color }}>
          {project.name}
        </Box>
        <Box component="span" sx={{ mx: 0.75 }}>
          ›
        </Box>
        <Box
          component="span"
          sx={{ background: 'action.hover', padding: '2px 7px', borderRadius: '4px' }}
        >
          {ticket.id}
        </Box>
      </Box>
      <Box sx={{ flex: 1 }} />
      <Tooltip title={t('tickets.detail.copyLink')}>
        <IconButton onClick={copyLink}>
          <Icon name="link" size={20} />
        </IconButton>
      </Tooltip>
      <IconButton
        onClick={(e) => setMoreMenu(e.currentTarget)}
        aria-label={t('common.moreActions')}
      >
        <Icon name="more_horiz" size={20} />
      </IconButton>

      <Menu
        open={!!moreMenu}
        anchorEl={moreMenu}
        onClose={() => setMoreMenu(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            setMoreMenu(null);
            onDelete();
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <Icon name="delete" size={18} sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText>{t('tickets.detail.deleteTicket')}</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
