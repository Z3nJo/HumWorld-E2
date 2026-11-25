import { render, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { DashboardSessionEnhancer } from './DashboardSessionEnhancer';

const clerk = vi.hoisted(() => ({
  isLoaded: false,
  isSignedIn: false,
  signOut: vi.fn(),
  email: 'admin@humworld.cl',
}));

vi.mock('@clerk/react', () => ({
  ClerkProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({ isLoaded: clerk.isLoaded, isSignedIn: clerk.isSignedIn }),
  useClerk: () => ({ signOut: clerk.signOut }),
  useUser: () => ({
    user: { primaryEmailAddress: { emailAddress: clerk.email } },
  }),
}));

beforeEach(() => {
  clerk.isLoaded = false;
  clerk.isSignedIn = false;
  clerk.signOut.mockReset().mockResolvedValue(undefined);
});

describe('DashboardSessionEnhancer', () => {
  it('keeps the public session state while Clerk is loading', async () => {
    const onSessionChange = vi.fn();
    render(
      <DashboardSessionEnhancer
        publishableKey="pk_test_example"
        onSessionChange={onSessionChange}
      />,
    );

    await waitFor(() => expect(onSessionChange).toHaveBeenCalledWith(null));
  });

  it('reveals the administrative session and signs out toward the dashboard', async () => {
    clerk.isLoaded = true;
    clerk.isSignedIn = true;
    const onSessionChange = vi.fn();
    render(
      <DashboardSessionEnhancer
        publishableKey="pk_test_example"
        onSessionChange={onSessionChange}
      />,
    );

    await waitFor(() => expect(onSessionChange).toHaveBeenCalledWith(expect.objectContaining({
      email: 'admin@humworld.cl',
      onSignOut: expect.any(Function),
    })));
    const session = onSessionChange.mock.calls.at(-1)?.[0];
    session.onSignOut();

    expect(clerk.signOut).toHaveBeenCalledWith({ redirectUrl: '/dashboard' });
  });
});
