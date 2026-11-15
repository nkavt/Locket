import { Avatar, Box, IconButton, Tooltip, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useMatch, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { SidebarRow } from './components/SidebarRow';
import { ProjectMenu } from './components/ProjectMenu';
import { ProjectRow } from './components/ProjectRow';
import { ArchivedSection } from './components/ArchivedSection';
import { scrollFadeMask, useScrollEdges } from './useScrollEdges';
import { NewProjectDialog } from '../NewProjectDialog';
import { EditProjectDialog } from '../EditProjectDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Icon } from '@/components/Icon';
import { AppMark } from '@/components/AppMark';
import { SectionLabel } from '@/components/SectionLabel';
import { APP_VERSION } from '@/data/constants';
import { isArchived } from '@/data/projectArchive';
import { projectPath, settingsPath } from '@/router';
import { useAppState, useProjectGroups, useTicketCounts } from '@/state/useAppState';
import { useCurrentUser } from '@/state/useCurrentUser';
import { useStoredFlag } from '@/state/useStoredFlag';
import { useThemeMode } from '@/state/useThemeMode';
import { monoFontFamily } from '@/theme';
import { avatarColor, initials } from '@/utils/format';
import type { Project } from '@/data/types';

/** Whether the Archived section is expanded; collapsed until the user opens it. */
export const ARCHIVED_OPEN_KEY = 'locket-sidebar-archived-open-v1';

export function Sidebar() {
  const { active: activeProjects, archived: archivedProjects } = useProjectGroups();
  const ticketCounts = useTicketCounts();
  const { deleteProject, updateProject } = useAppState();
  const currentUser = useCurrentUser();
  const { mode, toggle: toggleTheme } = useThemeMode();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const projectMatch = useMatch('/projects/:projectId/*');
  const activeProjectId = projectMatch?.params.projectId;
  const settingsActive = !!useMatch('/settings');

  // The project stays set while the menu closes, so its labels don't flip mid-animation.
  const [menu, setMenu] = useState<{ project: Project; anchor: HTMLElement | null } | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [archivedOpen, setArchivedOpen] = useStoredFlag(ARCHIVED_OPEN_KEY, false);

  // Landing on an archived project (a copied link, a reload, archiving the open project)
  // opens its section so the selected row is visible; SidebarRow then scrolls it into view.
  const viewingArchived = archivedProjects.some((p) => p.id === activeProjectId);
  useEffect(() => {
    if (viewingArchived) setArchivedOpen(true);
  }, [viewingArchived, activeProjectId, setArchivedOpen]);

  const {
    ref: listRef,
    onScroll: onListScroll,
    top: fadeTop,
    bottom: fadeBottom,
  } = useScrollEdges<HTMLDivElement>(
    `${activeProjects.length}/${archivedProjects.length}/${archivedOpen}`,
  );

  const renderRow = (p: Project) => (
    <ProjectRow
      key={p.id}
      project={p}
      ticketCount={ticketCounts[p.id] || 0}
      active={p.id === activeProjectId}
      dimmed={isArchived(p)}
      onContextMenu={(anchor) => setMenu({ project: p, anchor })}
    />
  );

  const confirmDelete = () => {
    if (!deleting) return;
    void deleteProject(deleting.id);
    if (deleting.id === activeProjectId) navigate('/');
  };

  return (
    <Box
      component="aside"
      sx={{
        width: 248,
        bgcolor: 'background.paper',
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

      {/* Navigation: the Projects header and System section stay put, only the rows scroll. */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: '12px 0',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px 6px',
          }}
        >
          <SectionLabel sx={{ fontWeight: 500 }}>{t('projects.sectionTitle')}</SectionLabel>
          <Tooltip title={t('projects.newProject')}>
            <IconButton size="small" onClick={() => setNewOpen(true)}>
              <Icon name="add" size={18} />
            </IconButton>
          </Tooltip>
        </Box>

        <Box
          ref={listRef}
          onScroll={onListScroll}
          sx={{
            flex: '0 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            padding: '0 8px',
            maskImage: scrollFadeMask({ top: fadeTop, bottom: fadeBottom }),
          }}
        >
          {activeProjects.map(renderRow)}
          {archivedProjects.length > 0 && (
            <ArchivedSection
              count={archivedProjects.length}
              open={archivedOpen}
              onToggle={() => setArchivedOpen(!archivedOpen)}
            >
              {archivedProjects.map(renderRow)}
            </ArchivedSection>
          )}
        </Box>

        <Box sx={{ padding: '18px 8px 0' }}>
          <SectionLabel sx={{ fontWeight: 500, padding: '0 8px 6px' }}>
            {t('projects.systemSection')}
          </SectionLabel>

          <SidebarRow to={settingsPath()} active={settingsActive}>
            <Box
              sx={{
                width: 22,
                height: 22,
                borderRadius: '6px',
                bgcolor: 'action.hover',
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
        archived={!!menu && isArchived(menu.project)}
        onClose={() => setMenu((m) => m && { ...m, anchor: null })}
        onRename={() => menu && setEditing(menu.project)}
        onToggleArchived={() =>
          menu && void updateProject(menu.project.id, { archived: !isArchived(menu.project) })
        }
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
