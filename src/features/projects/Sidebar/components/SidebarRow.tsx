import { Box } from '@mui/material';
import type { MouseEvent, ReactNode } from 'react';
import { Link } from 'react-router';

interface SidebarRowProps {
  to: string;
  active?: boolean;
  onContextMenu?: (anchor: HTMLElement) => void;
  children: ReactNode;
}

export function SidebarRow({ to, active, onContextMenu, children }: SidebarRowProps) {
  return (
    <Box
      component={Link}
      to={to}
      aria-current={active ? 'page' : undefined}
      onContextMenu={(e: MouseEvent<HTMLAnchorElement>) => {
        if (onContextMenu) {
          e.preventDefault();
          onContextMenu(e.currentTarget);
        }
      }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        padding: '7px 10px',
        borderRadius: '6px',
        cursor: 'pointer',
        textDecoration: 'none',
        fontSize: 13,
        fontWeight: active ? 500 : 400,
        background: (t) => (active ? t.palette.action.selected : 'transparent'),
        color: active ? 'primary.main' : 'text.primary',
        marginBottom: '1px',
        transition: 'background 0.12s',
        '&:hover': {
          background: (t) => (active ? t.palette.action.selected : t.palette.action.hover),
        },
      }}
    >
      {children}
    </Box>
  );
}
