import { useClerk, useUser } from '@clerk/react';
import { useCallback, useMemo } from 'react';
import { AppShell, type AppShellSession } from './AppShell';

export function AdminAppShell() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? 'Cuenta administrativa';
  const onSignOut = useCallback(() => {
    void signOut({ redirectUrl: '/dashboard' });
  }, [signOut]);
  const session = useMemo<AppShellSession>(
    () => ({ email, onSignOut }),
    [email, onSignOut],
  );

  return <AppShell session={session} />;
}
