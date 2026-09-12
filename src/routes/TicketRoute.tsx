import { Navigate, useParams } from 'react-router';
import { TicketDetail } from '@/features/tickets/TicketDetail';
import { useProject, useTicket } from '@/state/useAppState';
import { projectPath } from '@/router';

export function TicketRoute() {
  const { projectId, ticketId } = useParams();
  const project = useProject(projectId);
  const ticket = useTicket(ticketId);

  if (!project) return <Navigate to="/" replace />;
  if (!ticket || ticket.projectId !== project.id) {
    return <Navigate to={projectPath(project.id)} replace />;
  }
  return <TicketDetail ticket={ticket} project={project} />;
}
