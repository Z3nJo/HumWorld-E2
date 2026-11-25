import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AdminAppShell } from './AdminAppShell';

const clerk = vi.hoisted(() => ({
  signOut: vi.fn(),
}));

vi.mock('@clerk/react', () => ({
  useClerk: () => ({ signOut: clerk.signOut }),
  useUser: () => ({
    user: { primaryEmailAddress: { emailAddress: 'admin@humworld.cl' } },
  }),
}));

beforeEach(() => clerk.signOut.mockReset().mockResolvedValue(undefined));

it('connects the administrative shell session and signs out toward the dashboard', async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={['/dictionary']}>
      <AdminAppShell />
    </MemoryRouter>,
  );

  expect(screen.getByText('admin@humworld.cl')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Diccionario/i })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

  expect(clerk.signOut).toHaveBeenCalledWith({ redirectUrl: '/dashboard' });
});
