import { Dialog, DialogActions, DialogContent, DialogTitle, type DialogProps } from '@mui/material';
import type { ReactNode } from 'react';

export interface DialogBaseProps extends Omit<DialogProps, 'title' | 'children'> {
  title: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
}

export function DialogBase({ title, children, actions, ...rest }: DialogBaseProps) {
  return (
    <Dialog {...rest}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>{children}</DialogContent>
      {actions && <DialogActions>{actions}</DialogActions>}
    </Dialog>
  );
}
