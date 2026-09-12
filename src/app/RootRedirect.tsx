import { Button } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { NewProjectDialog } from '@/features/projects/NewProjectDialog';
import { useProjects } from '@/state/useAppState';
import { projectPath } from '@/router';

/** "/" → first project, or an empty state when there are none. */
export function RootRedirect() {
  const projects = useProjects();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (projects.length > 0) {
    return <Navigate to={projectPath(projects[0].id)} replace />;
  }

  return (
    <>
      <EmptyState
        icon="folder_off"
        title={t('projects.empty.title')}
        subtitle={t('projects.empty.subtitle')}
        action={
          <Button
            variant="contained"
            startIcon={<Icon name="add" size={18} />}
            onClick={() => setDialogOpen(true)}
          >
            {t('projects.newProject')}
          </Button>
        }
      />
      <NewProjectDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={(p) => navigate(projectPath(p.id))}
      />
    </>
  );
}
