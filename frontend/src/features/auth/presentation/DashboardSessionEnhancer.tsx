import { ClerkProvider, useAuth, useClerk, useUser } from '@clerk/react';
import { esES } from '@clerk/localizations';
import { useCallback, useEffect } from 'react';
import type { AppShellSession } from '../../../components/AppShell/AppShell';

type DashboardSessionEnhancerProps = {
  publishableKey: string;
  onSessionChange: (session: AppShellSession | null) => void;
};

function DashboardSessionObserver({
  onSessionChange,
}: Pick<DashboardSessionEnhancerProps, 'onSessionChange'>) {
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? 'Cuenta administrativa';
  const onSignOut = useCallback(() => {
    void signOut({ redirectUrl: '/dashboard' });
  }, [signOut]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      onSessionChange(null);
      return;
    }
    onSessionChange({ email, onSignOut });
  }, [email, isLoaded, isSignedIn, onSessionChange, onSignOut]);

  return null;
}

export function DashboardSessionEnhancer({
  publishableKey,
  onSessionChange,
}: DashboardSessionEnhancerProps) {
  return (
    <ClerkProvider publishableKey={publishableKey} localization={esES}>
      <DashboardSessionObserver onSessionChange={onSessionChange} />
    </ClerkProvider>
  );
}
