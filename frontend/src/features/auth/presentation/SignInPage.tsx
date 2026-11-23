import { useAuth, useSignIn } from '@clerk/react';
import { type FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import './auth.css';

type SignInLocationState = {
  from?: unknown;
};

type FormMode = 'login' | 'device-trust-code' | 'recovery-email' | 'recovery-code' | 'recovery-password';

const clerkErrorMessages: Record<string, string> = {
  form_identifier_not_found: 'No existe una cuenta administrativa con ese correo.',
  form_password_incorrect: 'La contraseña es incorrecta.',
  form_code_incorrect: 'El código ingresado no es válido.',
  form_code_expired: 'El código expiró. Solicita uno nuevo.',
  form_param_format_invalid: 'Revisa el formato de los datos ingresados.',
  form_password_pwned: 'Elige una contraseña que no haya aparecido en filtraciones conocidas.',
  too_many_requests: 'Se realizaron demasiados intentos. Espera un momento y vuelve a probar.',
};

function safeReturnPath(state: SignInLocationState | null): string {
  const candidate = state?.from;
  if (typeof candidate !== 'string' || !candidate.startsWith('/') || candidate.startsWith('//')) {
    return '/dashboard';
  }
  return candidate;
}

function localizedClerkError(error: unknown, fallback: string): string {
  if (typeof error !== 'object' || error === null || !('code' in error)) return fallback;
  const code = String((error as { code: unknown }).code);
  return clerkErrorMessages[code] ?? fallback;
}

export function SignInPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signIn, fetchStatus } = useSignIn();
  const location = useLocation();
  const navigate = useNavigate();
  const returnTo = safeReturnPath(location.state as SignInLocationState | null);
  const [mode, setMode] = useState<FormMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const busy = submitting || fetchStatus === 'fetching';

  if (!isLoaded) {
    return <div className="auth-loading" role="status">Cargando inicio de sesión…</div>;
  }
  if (isSignedIn) {
    return <Navigate to={returnTo} replace />;
  }

  async function finalizeSession(): Promise<boolean> {
    const result = await signIn.finalize({
      navigate: ({ decorateUrl }) => {
        const destination = decorateUrl(returnTo);
        if (/^https?:\/\//.test(destination)) {
          window.location.assign(destination);
          return;
        }
        navigate(destination, { replace: true });
      },
    });
    if (result.error) {
      setFormError(localizedClerkError(result.error, 'No fue posible iniciar la sesión.'));
      return false;
    }
    return true;
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const result = await signIn.password({
        emailAddress: email.trim(),
        password,
      });
      if (result.error) {
        setFormError(localizedClerkError(result.error, 'El correo o la contraseña no son válidos.'));
        return;
      }
      if (signIn.status === 'needs_client_trust' || signIn.status === 'needs_second_factor') {
        const supportsEmailCode = signIn.supportedSecondFactors?.some(
          (factor) => factor.strategy === 'email_code',
        );
        if (!supportsEmailCode) {
          setFormError(
            signIn.status === 'needs_second_factor'
              ? 'Esta cuenta requiere un segundo factor de MFA que HumWorld no admite. Desactiva MFA/TOTP para esta cuenta en Clerk.'
              : 'Clerk solicitó una verificación de dispositivo que no está disponible por correo para esta cuenta.',
          );
          return;
        }
        const delivery = await signIn.mfa.sendEmailCode();
        if (delivery.error) {
          setFormError(localizedClerkError(delivery.error, 'No fue posible enviar el código de confianza del dispositivo.'));
          return;
        }
        setCode('');
        setNotice('Clerk envió un código a tu correo para verificar este dispositivo.');
        setMode('device-trust-code');
        return;
      }
      if (signIn.status !== 'complete') {
        setFormError(`Clerk no completó el inicio de sesión (estado: ${signIn.status}). Revisa la configuración de la cuenta.`);
        return;
      }
      await finalizeSession();
    } catch {
      setFormError('No fue posible comunicarse con Clerk. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeviceTrustCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const result = await signIn.mfa.verifyEmailCode({ code: code.trim() });
      if (result.error) {
        setFormError(localizedClerkError(result.error, 'El código de confianza no es válido o expiró.'));
        return;
      }
      if (signIn.status !== 'complete') {
        setFormError('Clerk no pudo completar la verificación del dispositivo. Intenta nuevamente.');
        return;
      }
      await finalizeSession();
    } catch {
      setFormError('No fue posible verificar el código del dispositivo.');
    } finally {
      setSubmitting(false);
    }
  }

  async function resendDeviceTrustCode() {
    setFormError(null);
    setSubmitting(true);
    try {
      const result = await signIn.mfa.sendEmailCode();
      if (result.error) {
        setFormError(localizedClerkError(result.error, 'No fue posible reenviar el código.'));
        return;
      }
      setNotice('Enviamos un nuevo código de confianza a tu correo.');
    } catch {
      setFormError('No fue posible reenviar el código.');
    } finally {
      setSubmitting(false);
    }
  }

  async function openRecovery() {
    setFormError(null);
    setNotice(null);
    await signIn.reset();
    setMode('recovery-email');
  }

  async function handleRecoveryEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const creation = await signIn.create({ identifier: email.trim() });
      if (creation.error) {
        setFormError(localizedClerkError(creation.error, 'No fue posible encontrar esa cuenta.'));
        return;
      }
      const delivery = await signIn.resetPasswordEmailCode.sendCode();
      if (delivery.error) {
        setFormError(localizedClerkError(delivery.error, 'No fue posible enviar el código.'));
        return;
      }
      setNotice('Enviamos un código de recuperación al correo de la cuenta.');
      setMode('recovery-code');
    } catch {
      setFormError('No fue posible enviar el código de recuperación.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRecoveryCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const result = await signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() });
      if (result.error) {
        setFormError(localizedClerkError(result.error, 'El código no es válido o expiró.'));
        return;
      }
      setNotice(null);
      setMode('recovery-password');
    } catch {
      setFormError('No fue posible verificar el código.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRecoveryPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (newPassword !== confirmPassword) {
      setFormError('Las contraseñas no coinciden.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await signIn.resetPasswordEmailCode.submitPassword({
        password: newPassword,
      });
      if (result.error) {
        setFormError(localizedClerkError(result.error, 'No fue posible actualizar la contraseña.'));
        return;
      }
      if (signIn.status !== 'complete') {
        setFormError('Clerk no pudo completar la recuperación de la cuenta.');
        return;
      }
      await finalizeSession();
    } catch {
      setFormError('No fue posible actualizar la contraseña.');
    } finally {
      setSubmitting(false);
    }
  }

  async function returnToLogin() {
    await signIn.reset();
    setMode('login');
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    setFormError(null);
    setNotice(null);
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <p className="auth-sign-in__brand">HumWorld · Administración</p>
        <h1 id="auth-title">
          {mode === 'login' ? 'Iniciar sesión' : 'Recuperar contraseña'}
        </h1>
        <p className="auth-card__intro">
          {mode === 'login'
            ? 'Accede con una de las cuentas administrativas autorizadas.'
            : mode === 'device-trust-code'
              ? 'Confirma que eres tú ingresando el código enviado por Clerk a tu correo.'
            : 'La recuperación se realizará mediante el correo asociado en Clerk.'}
        </p>

        {formError && <div className="auth-message auth-message--error" role="alert">{formError}</div>}
        {notice && <div className="auth-message" role="status">{notice}</div>}

        {mode === 'login' && (
          <form className="auth-form" onSubmit={(event) => void handleLogin(event)}>
            <label htmlFor="admin-email">Correo electrónico</label>
            <input id="admin-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <label htmlFor="admin-password">Contraseña</label>
            <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
            <button className="auth-link" type="button" onClick={() => void openRecovery()} disabled={busy}>¿Olvidaste tu contraseña?</button>
          </form>
        )}

        {mode === 'recovery-email' && (
          <form className="auth-form" onSubmit={(event) => void handleRecoveryEmail(event)}>
            <label htmlFor="recovery-email">Correo electrónico</label>
            <input id="recovery-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Enviando…' : 'Enviar código'}</button>
          </form>
        )}

        {mode === 'device-trust-code' && (
          <form className="auth-form" onSubmit={(event) => void handleDeviceTrustCode(event)}>
            <label htmlFor="device-trust-code">Código de verificación</label>
            <input id="device-trust-code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} required />
            <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Verificando…' : 'Verificar dispositivo'}</button>
            <button className="auth-link" type="button" onClick={() => void resendDeviceTrustCode()} disabled={busy}>Reenviar código</button>
          </form>
        )}

        {mode === 'recovery-code' && (
          <form className="auth-form" onSubmit={(event) => void handleRecoveryCode(event)}>
            <label htmlFor="recovery-code">Código de recuperación</label>
            <input id="recovery-code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} required />
            <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Verificando…' : 'Verificar código'}</button>
          </form>
        )}

        {mode === 'recovery-password' && (
          <form className="auth-form" onSubmit={(event) => void handleRecoveryPassword(event)}>
            <label htmlFor="new-password">Nueva contraseña</label>
            <input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
            <label htmlFor="confirm-password">Confirmar nueva contraseña</label>
            <input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
            <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar contraseña'}</button>
          </form>
        )}

        {mode !== 'login' && (
          <button className="auth-link" type="button" onClick={() => void returnToLogin()} disabled={busy}>Volver al inicio de sesión</button>
        )}
        <p className="auth-card__provider">Autenticación protegida por Clerk</p>
      </section>
    </main>
  );
}
