import { Box } from '@mui/material';
import { Outlet } from 'react-router';
import { AppProviders } from './AppProviders';
import { Sidebar } from '@/features/projects/Sidebar';
import { useAppState } from '@/state/useAppState';

function Shell() {
  const { hydrated } = useAppState();
  return (
    <Box sx={{ height: '100vh', display: 'flex', background: 'background.default' }}>
      <Sidebar />
      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {hydrated && <Outlet />}
      </Box>
    </Box>
  );
}

export function RootLayout() {
  return (
    <AppProviders>
      <Shell />
    </AppProviders>
  );
}
