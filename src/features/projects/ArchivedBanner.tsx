import { Alert, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/Icon';
import { useAppState } from '@/state/useAppState';
import type { Project } from '@/data/types';

/** Strip at the top of an archived project's page, with a way to restore it. */
export function ArchivedBanner({ project }: { project: Project }) {
  const { t } = useTranslation();
  const { updateProject } = useAppState();
  return (
    <Alert
      severity="info"
      icon={<Icon name="archive" size={20} />}
      action={
        <Button
          color="inherit"
          size="small"
          onClick={() => void updateProject(project.id, { archived: false })}
        >
          {t('projects.archive.unarchive')}
        </Button>
      }
      sx={{
        borderRadius: 0,
        borderBottom: 1,
        borderColor: 'divider',
        padding: '2px 28px',
        alignItems: 'center',
      }}
    >
      {t('projects.archive.banner')}
    </Alert>
  );
}
