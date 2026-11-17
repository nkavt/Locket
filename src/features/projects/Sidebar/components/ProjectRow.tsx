import { Box } from '@mui/material';
import { SidebarRow } from './SidebarRow';
import { ProjectAvatar } from '@/components/ProjectAvatar';
import { TruncatedText } from '@/components/TruncatedText';
import { projectPath } from '@/router';
import { monoFontFamily } from '@/theme';
import type { Project } from '@/data/types';

interface ProjectRowProps {
  project: Project;
  ticketCount: number;
  active: boolean;
  /** Lower-contrast name and avatar, for archived projects. */
  dimmed?: boolean;
  onContextMenu: (anchor: HTMLElement) => void;
}

/** One project in the sidebar list: avatar, name and ticket count. */
export function ProjectRow({
  project,
  ticketCount,
  active,
  dimmed,
  onContextMenu,
}: ProjectRowProps) {
  return (
    <SidebarRow to={projectPath(project.id)} active={active} onContextMenu={onContextMenu}>
      <Box sx={{ display: 'inline-flex', opacity: dimmed ? 0.55 : 1 }}>
        <ProjectAvatar project={project} />
      </Box>
      <TruncatedText sx={{ flex: 1, color: dimmed && !active ? 'text.secondary' : undefined }}>
        {project.name}
      </TruncatedText>
      <Box sx={{ fontSize: 11, color: 'text.disabled', fontFamily: monoFontFamily }}>
        {ticketCount}
      </Box>
    </SidebarRow>
  );
}
