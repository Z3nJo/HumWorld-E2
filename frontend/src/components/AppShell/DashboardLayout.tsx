import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useState,
  type ReactNode,
} from 'react';
import { AppShell, type AppShellSession } from './AppShell';

const DashboardSessionEnhancer = lazy(() => (
  import('../../features/auth/presentation/DashboardSessionEnhancer').then(
    (module) => ({ default: module.DashboardSessionEnhancer }),
  )
));

type SessionBoundaryProps = {
  children: ReactNode;
  onFailure: () => void;
};

type SessionBoundaryState = {
  failed: boolean;
};

export class SessionEnhancementBoundary extends Component<
  SessionBoundaryProps,
  SessionBoundaryState
> {
  state: SessionBoundaryState = { failed: false };

  static getDerivedStateFromError(): SessionBoundaryState {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFailure();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

type DashboardLayoutProps = {
  publishableKey?: string;
};

export function DashboardLayout({
  publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim() ?? '',
}: DashboardLayoutProps) {
  const [session, setSession] = useState<AppShellSession | null>(null);
  const clearSession = useCallback(() => setSession(null), []);

  return (
    <>
      <AppShell session={session} />
      {publishableKey && (
        <SessionEnhancementBoundary onFailure={clearSession}>
          <Suspense fallback={null}>
            <DashboardSessionEnhancer
              publishableKey={publishableKey}
              onSessionChange={setSession}
            />
          </Suspense>
        </SessionEnhancementBoundary>
      )}
    </>
  );
}
