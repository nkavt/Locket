import { Alert, Snackbar } from '@mui/material';
import { useCallback, useState, type ReactNode } from 'react';
import { SnackbarContext, type ShowSnack, type SnackSeverity } from './SnackbarContext';

interface SnackMessage {
  text: string;
  severity: SnackSeverity;
  duration: number;
  id: number;
}

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<SnackMessage | null>(null);

  const show = useCallback<ShowSnack>((text, opts = {}) => {
    setMsg({
      text,
      severity: opts.severity || 'info',
      duration: opts.duration ?? 2400,
      id: Math.random(),
    });
  }, []);

  return (
    <SnackbarContext.Provider value={show}>
      {children}
      <Snackbar
        open={!!msg}
        autoHideDuration={msg?.duration ?? 2400}
        onClose={() => setMsg(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {msg ? (
          <Alert
            severity={msg.severity}
            variant="filled"
            sx={{ fontSize: 13 }}
            onClose={() => setMsg(null)}
          >
            {msg.text}
          </Alert>
        ) : undefined}
      </Snackbar>
    </SnackbarContext.Provider>
  );
}
