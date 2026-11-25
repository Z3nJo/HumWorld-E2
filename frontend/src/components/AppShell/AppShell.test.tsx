import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('renders the public navigation without administrative modules', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppShell />
      </MemoryRouter>,
    );

    expect(screen.getByText('HumWorld')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Dashboard de humor/i })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'Acceso administrativo' })).toHaveAttribute('href', '/sign-in');
    expect(screen.queryByRole('link', { name: /Diccionario/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Parámetros/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Fuentes y canales/i })).not.toBeInTheDocument();
  });

  it('shows administrative links and delegates sign-out for an active session', async () => {
    const onSignOut = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppShell session={{ email: 'admin@humworld.cl', onSignOut }} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Diccionario/i })).toHaveAttribute('href', '/dictionary');
    expect(screen.getByRole('link', { name: /Parámetros/i })).toHaveAttribute('href', '/parametros');
    expect(screen.getByRole('link', { name: /Fuentes y canales/i })).toHaveAttribute('href', '/fuentes');
    expect(screen.queryByRole('link', { name: 'Acceso administrativo' })).not.toBeInTheDocument();
    expect(screen.getByText('admin@humworld.cl')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(onSignOut).toHaveBeenCalledOnce();
  });
});
