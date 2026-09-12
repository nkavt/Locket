import { ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import { Icon } from '@/components/Icon';
import { useTranslation } from 'react-i18next';

interface ProjectMenuProps {
  anchor: HTMLElement | null;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export function ProjectMenu({ anchor, onClose, onRename, onDelete }: ProjectMenuProps) {
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
      <MenuItem onClick={pick(onDelete)} sx={{ color: 'error.main' }}>
        <ListItemIcon>
          <Icon name="delete" size={18} sx={{ color: 'error.main' }} />
        </ListItemIcon>
        <ListItemText>{t('projects.deleteProject')}</ListItemText>
      </MenuItem>
    </Menu>
  );
}
