import { Avatar, Box, IconButton, Tooltip, Typography } from '@mui/material';
import { useState } from 'react';
import { useMatch, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { SidebarRow } from './components/SidebarRow';
import { ProjectMenu } from './components/ProjectMenu';
import { NewProjectDialog } from '../NewProjectDialog';
import { EditProjectDialog } from '../EditProjectDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Icon } from '@/components/Icon';
import { AppMark } from '@/components/AppMark';
import { ProjectAvatar } from '@/components/ProjectAvatar';
import { SectionLabel } from '@/components/SectionLabel';
import { APP_VERSION } from '@/data/constants';
import { projectPath, settingsPath } from '@/router';
import { useAppState, useProjects, useTicketCounts } from '@/state/useAppState';
import { useCurrentUser } from '@/state/useCurrentUser';
import { useThemeMode } from '@/state/useThemeMode';
import { monoFontFamily } from '@/theme';
import { avatarColor, initials } from '@/utils/format';
import type { Project } from '@/data/types';

export function Sidebar() {
  const projects = useProjects();
  const ticketCounts = useTicketCounts();
  const { deleteProject } = useAppState();
  const currentUser = useCurrentUser();
  const { mode, toggle: toggleTheme } = useThemeMode();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const projectMatch = useMatch('/projects/:projectId/*');
  const activeProjectId = projectMatch?.params.projectId;
  const settingsActive = !!useMatch('/settings');

  const [menu, setMenu] = useState<{ project: Project; anchor: HTMLElement } | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);

  const confirmDelete = () => {
    if (!deleting) return;
    deleteProject(deleting.id);
    if (deleting.id === activeProjectId) navigate('/');
  };

  return (
    <Box
      component="aside"
      sx={{
        width: 248,
        background: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      {/* Brand */}
      <Box
        sx={{
          px: 2,
          pt: 1.75,
          pb: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <AppMark size={28} />
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 500 }}>{t('app.name')}</Typography>
          <Typography sx={{ fontSize: 10.5, color: 'text.disabled', fontFamily: monoFontFamily }}>
            {t('app.versionTag', { version: APP_VERSION })}
          </Typography>
        </Box>
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 8px 6px',
          }}
        >
          <SectionLabel sx={{ fontWeight: 500 }}>{t('projects.sectionTitle')}</SectionLabel>
          <Tooltip title={t('projects.newProject')}>
            <IconButton size="small" onClick={() => setNewOpen(true)}>
              <Icon name="add" size={18} />
            </IconButton>
          </Tooltip>
        </Box>

        {projects.map((p) => (
          <SidebarRow
            key={p.id}
            to={projectPath(p.id)}
            active={p.id === activeProjectId}
            onContextMenu={(anchor) => setMenu({ project: p, anchor })}
          >
            <ProjectAvatar project={p} />
            <Box
              sx={{
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {p.name}
            </Box>
            <Box sx={{ fontSize: 11, color: 'text.disabled', fontFamily: monoFontFamily }}>
              {ticketCounts[p.id] || 0}
            </Box>
          </SidebarRow>
        ))}

        <Box sx={{ height: 18 }} />
        <SectionLabel sx={{ fontWeight: 500, padding: '0 8px 6px' }}>
          {t('projects.systemSection')}
        </SectionLabel>

        <SidebarRow to={settingsPath()} active={settingsActive}>
          <Box
            sx={{
              width: 22,
              height: 22,
              borderRadius: '6px',
              background: 'action.hover',
              color: 'text.secondary',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon name="settings" size={14} />
          </Box>
          <Box sx={{ flex: 1 }}>{t('projects.settingsLink')}</Box>
        </SidebarRow>
      </Box>

      {/* Footer / user */}
      <Box
        sx={{
          padding: 1.25,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
        }}
      >
        <Avatar sx={{ width: 28, height: 28, background: avatarColor(currentUser), fontSize: 12 }}>
          {initials(currentUser)}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: 12.5,
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {currentUser}
          </Typography>
          <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>
            {t('app.localWorkspace')}
          </Typography>
        </Box>
        <Tooltip title={t('app.toggleTheme')}>
          <IconButton size="small" onClick={toggleTheme}>
            <Icon name={mode === 'dark' ? 'light_mode' : 'dark_mode'} size={18} />
          </IconButton>
        </Tooltip>
      </Box>

      <ProjectMenu
        anchor={menu?.anchor ?? null}
        onClose={() => setMenu(null)}
        onRename={() => menu && setEditing(menu.project)}
        onDelete={() => menu && setDeleting(menu.project)}
      />
      <NewProjectDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={(p) => navigate(projectPath(p.id))}
      />
      <EditProjectDialog open={!!editing} project={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={!!deleting}
        title={t('projects.deleteConfirm.title')}
        message={t('projects.deleteConfirm.message', { name: deleting?.name ?? '' })}
        confirmLabel={t('common.delete')}
        danger
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </Box>
  );
}
