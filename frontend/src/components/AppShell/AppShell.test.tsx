import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppShell } from './AppShell';

const signOut = vi.hoisted(() => vi.fn());

vi.mock('@clerk/react', () => ({
  useClerk: () => ({ signOut }),
  useUser: () => ({
    user: { primaryEmailAddress: { emailAddress: 'admin@humworld.cl' } },
  }),
}));

beforeEach(() => signOut.mockReset());

describe('AppShell', () => {
  it('renders the HumWorld branding and navigation links', () => {
    render(
      <MemoryRouter initialEntries={['/dictionary']}>
        <AppShell />
      </MemoryRouter>,
    );

    expect(screen.getByText('HumWorld')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Diccionario/i })).toHaveAttribute(
      'href',
      '/dictionary',
    );
    expect(screen.getByRole('link', { name: /Parámetros/i })).toHaveAttribute(
      'href',
      '/parametros',
    );
    expect(screen.getByRole('link', { name: /Fuentes y canales/i })).toHaveAttribute(
      'href',
      '/fuentes',
    );
  });

  it('shows the active account and signs out toward the landing', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppShell />
      </MemoryRouter>,
    );

    expect(screen.getByText('admin@humworld.cl')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(signOut).toHaveBeenCalledWith({ redirectUrl: '/' });
  });
});
