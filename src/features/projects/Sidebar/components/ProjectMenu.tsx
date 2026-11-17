import { ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import { Icon } from '@/components/Icon';
import { useTranslation } from 'react-i18next';

interface ProjectMenuProps {
  anchor: HTMLElement | null;
  /** Whether the project is archived: picks Archive or Unarchive. */
  archived: boolean;
  onClose: () => void;
  onRename: () => void;
  onToggleArchived: () => void;
  onDelete: () => void;
}

export function ProjectMenu({
  anchor,
  archived,
  onClose,
  onRename,
  onToggleArchived,
  onDelete,
}: ProjectMenuProps) {
  const { t } = useTranslation();
  const pick = (fn: () => void) => () => {
    fn();
    onClose();
  };
  return (
    <Menu
      open={!!anchor}
      anchorEl={anchor}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <MenuItem onClick={pick(onRename)}>
        <ListItemIcon>
          <Icon name="edit" size={18} />
        </ListItemIcon>
        <ListItemText>{t('projects.editProject')}</ListItemText>
      </MenuItem>
      <MenuItem onClick={pick(onToggleArchived)}>
        <ListItemIcon>
          <Icon name={archived ? 'unarchive' : 'archive'} size={18} />
        </ListItemIcon>
        <ListItemText>
          {archived ? t('projects.archive.unarchiveProject') : t('projects.archive.archive')}
        </ListItemText>
      </MenuItem>
      <MenuItem onClick={pick(onDelete)} sx={{ color: 'error.main' }}>
        <ListItemIcon>
          <Icon name="delete" size={18} sx={{ color: 'error.main' }} />
        </ListItemIcon>
        <ListItemText>{t('projects.deleteProject')}</ListItemText>
      </MenuItem>
    </Menu>
  );
}
