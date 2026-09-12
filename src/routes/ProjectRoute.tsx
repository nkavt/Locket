import { Navigate, useParams } from 'react-router';
import { TicketList } from '@/features/tickets/TicketList';
import { useProject } from '@/state/useAppState';

export function ProjectRoute() {
  const { projectId } = useParams();
  const project = useProject(projectId);
  if (!project) return <Navigate to="/" replace />;
  return <TicketList project={project} />;
}
