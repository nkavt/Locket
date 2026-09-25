import { FormProvider, useForm } from 'react-hook-form';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { McpServerCard } from './McpServerCard';
import { installMockLocket } from '@/test/mockLocket';
import { act, renderWithProviders, screen, userEvent, waitFor } from '@/test/render';

function Form({ children }: { children: ReactNode }) {
  const form = useForm({ mode: 'onChange', defaultValues: { port: '7821' } });
  return <FormProvider {...form}>{children}</FormProvider>;
}

describe('McpServerCard', () => {
  it('explains that the server is unavailable outside Electron', () => {
    renderWithProviders(
      <Form>
        <McpServerCard />
      </Form>,
    );
    expect(screen.getByText(/runs inside the desktop app/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start server' })).toBeDisabled();
  });

  it('starts and stops the server through the bridge and shows its log', async () => {
    const mock = installMockLocket();
    renderWithProviders(
      <Form>
        <McpServerCard />
      </Form>,
    );
    const start = await screen.findByRole('button', { name: 'Start server' });
    await waitFor(() => expect(start).toBeEnabled());
    await userEvent.click(start);

    expect(await screen.findByText('Running')).toBeInTheDocument();
    expect(screen.getByText('http://127.0.0.1:7821/mcp')).toBeInTheDocument();
    expect(mock.mcp.running).toBe(true);

    act(() => mock.emitLog('tools/call list_projects'));
    expect(await screen.findByText('tools/call list_projects')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Stop server' }));
    expect(await screen.findByText('Stopped')).toBeInTheDocument();
    expect(mock.mcp.running).toBe(false);
  });
});
