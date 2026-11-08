import { Box } from '@mui/material';
import { Icon } from './Icon';
import type { Project } from '@/data/types';
import { tintBg, tintText } from '@/utils/tint';

interface ProjectAvatarProps {
  project: Pick<Project, 'icon' | 'color'>;
  size?: number;
}

/** Coloured rounded tile with the project's icon. */
export function ProjectAvatar({ project, size = 22 }: ProjectAvatarProps) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: `${Math.round(size * 0.27)}px`,
        bgcolor: (t) => tintBg(t, project.color),
        color: (t) => tintText(t, project.color),
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon name={project.icon} size={Math.round(size * 0.63)} />
    </Box>
  );
}
