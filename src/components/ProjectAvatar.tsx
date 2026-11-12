import { Box } from '@mui/material';
import { MaterialSymbol } from './MaterialSymbol';
import type { Project } from '@/data/types';
import { DEFAULT_PROJECT_ICON, isMaterialSymbol } from '@/data/projectIcons';
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
      <MaterialSymbol
        name={isMaterialSymbol(project.icon) ? project.icon : DEFAULT_PROJECT_ICON}
        size={Math.round(size * 0.63)}
      />
    </Box>
  );
}
