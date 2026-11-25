import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SignInPage } from './SignInPage';

const clerk = vi.hoisted(() => ({
  isLoaded: true,
  isSignedIn: false,
  fetchStatus: 'idle',
  status: 'needs_identifier',
  supportedSecondFactors: [] as Array<{ strategy: string }>,
  password: vi.fn(),
  sendMfaEmailCode: vi.fn(),
  verifyMfaEmailCode: vi.fn(),
  create: vi.fn(),
  finalize: vi.fn(),
  reset: vi.fn(),
  sendCode: vi.fn(),
  verifyCode: vi.fn(),
  submitPassword: vi.fn(),
}));

vi.mock('@clerk/react', () => ({
  useAuth: () => ({ isLoaded: clerk.isLoaded, isSignedIn: clerk.isSignedIn }),
  useSignIn: () => ({
    fetchStatus: clerk.fetchStatus,
    signIn: {
      get status() {
        return clerk.status;
      },
      get supportedSecondFactors() {
        return clerk.supportedSecondFactors;
      },
      password: clerk.password,
      mfa: {
        sendEmailCode: clerk.sendMfaEmailCode,
        verifyEmailCode: clerk.verifyMfaEmailCode,
      },
      create: clerk.create,
      finalize: clerk.finalize,
      reset: clerk.reset,
      resetPasswordEmailCode: {
        sendCode: clerk.sendCode,
        verifyCode: clerk.verifyCode,
        submitPassword: clerk.submitPassword,
      },
    },
  }),
}));

beforeEach(() => {
  clerk.isLoaded = true;
  clerk.isSignedIn = false;
  clerk.fetchStatus = 'idle';
  clerk.status = 'needs_identifier';
  clerk.supportedSecondFactors = [];
  clerk.password.mockReset().mockImplementation(async () => {
    clerk.status = 'complete';
    return { error: null };
  });
  clerk.sendMfaEmailCode.mockReset().mockResolvedValue({ error: null });
  clerk.verifyMfaEmailCode.mockReset().mockImplementation(async () => {
    clerk.status = 'complete';
    return { error: null };
  });
  clerk.create.mockReset().mockImplementation(async () => {
    clerk.status = 'needs_first_factor';
    return { error: null };
  });
  clerk.finalize.mockReset().mockImplementation(async (options) => {
    await options?.navigate?.({
      session: {},
      decorateUrl: (url: string) => url,
    });
    return { error: null };
  });
  clerk.reset.mockReset().mockImplementation(async () => {
    clerk.status = 'needs_identifier';
    return { error: null };
  });
  clerk.sendCode.mockReset().mockResolvedValue({ error: null });
  clerk.verifyCode.mockReset().mockImplementation(async () => {
    clerk.status = 'needs_new_password';
    return { error: null };
  });
  clerk.submitPassword.mockReset().mockImplementation(async () => {
    clerk.status = 'complete';
    return { error: null };
  });
});

function renderSignIn(from: string = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/sign-in', state: { from } }]}>
      <Routes>
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/dashboard" element={<div>Dashboard público con sesión</div>} />
        <Route path="/fuentes" element={<div>Fuentes protegidas</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SignInPage', () => {
  it('shows email and password together in Spanish without registration or social providers', () => {
    renderSignIn();

    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.queryByText(/registr/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/google/i)).not.toBeInTheDocument();
  });

  it('submits both credentials to Clerk and returns to the requested route', async () => {
    const user = userEvent.setup();
    renderSignIn('/fuentes');

    await user.type(screen.getByLabelText('Correo electrónico'), 'admin@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'clave-segura');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    await waitFor(() => expect(clerk.password).toHaveBeenCalledWith({
      emailAddress: 'admin@example.com',
      password: 'clave-segura',
    }));
    expect(clerk.finalize).toHaveBeenCalledOnce();
    expect(await screen.findByText('Fuentes protegidas')).toBeInTheDocument();
  });

  it('shows Clerk password errors in Spanish', async () => {
    clerk.password.mockResolvedValueOnce({
      error: { code: 'form_password_incorrect' },
    });
    const user = userEvent.setup();
    renderSignIn();

    await user.type(screen.getByLabelText('Correo electrónico'), 'admin@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'incorrecta');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('La contraseña es incorrecta.');
    expect(clerk.finalize).not.toHaveBeenCalled();
  });

  it('verifies a new device with Clerk email code before finalizing the session', async () => {
    clerk.supportedSecondFactors = [{ strategy: 'email_code' }];
    clerk.password.mockImplementationOnce(async () => {
      clerk.status = 'needs_client_trust';
      return { error: null };
    });
    const user = userEvent.setup();
    renderSignIn('/fuentes');

    await user.type(screen.getByLabelText('Correo electrónico'), 'admin@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'clave-segura');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByText(/Clerk envió un código/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Código de verificación'), '123456');
    await user.click(screen.getByRole('button', { name: 'Verificar dispositivo' }));

    expect(clerk.sendMfaEmailCode).toHaveBeenCalledOnce();
    expect(clerk.verifyMfaEmailCode).toHaveBeenCalledWith({ code: '123456' });
    expect(clerk.finalize).toHaveBeenCalledOnce();
    expect(await screen.findByText('Fuentes protegidas')).toBeInTheDocument();
  });

  it('explains when Clerk requires an unsupported authenticator factor', async () => {
    clerk.password.mockImplementationOnce(async () => {
      clerk.status = 'needs_second_factor';
      return { error: null };
    });
    const user = userEvent.setup();
    renderSignIn();

    await user.type(screen.getByLabelText('Correo electrónico'), 'admin@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'clave-segura');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Desactiva MFA\/TOTP/);
    expect(clerk.finalize).not.toHaveBeenCalled();
  });

  it('keeps password recovery through an email code', async () => {
    const user = userEvent.setup();
    renderSignIn('/dashboard');

    await user.type(screen.getByLabelText('Correo electrónico'), 'admin@example.com');
    await user.click(screen.getByRole('button', { name: '¿Olvidaste tu contraseña?' }));
    await user.click(await screen.findByRole('button', { name: 'Enviar código' }));

    expect(clerk.create).toHaveBeenCalledWith({ identifier: 'admin@example.com' });
    expect(clerk.sendCode).toHaveBeenCalledOnce();
    await user.type(await screen.findByLabelText('Código de recuperación'), '123456');
    await user.click(screen.getByRole('button', { name: 'Verificar código' }));

    expect(clerk.verifyCode).toHaveBeenCalledWith({ code: '123456' });
    await user.type(await screen.findByLabelText('Nueva contraseña'), 'nueva-clave');
    await user.type(screen.getByLabelText('Confirmar nueva contraseña'), 'nueva-clave');
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }));

    expect(clerk.submitPassword).toHaveBeenCalledWith({ password: 'nueva-clave' });
    expect(clerk.finalize).toHaveBeenCalledOnce();
    expect(await screen.findByText('Dashboard público con sesión')).toBeInTheDocument();
  });

  it('returns an authenticated session to the original protected route', () => {
    clerk.isSignedIn = true;
    renderSignIn('/fuentes');

    expect(screen.getByText('Fuentes protegidas')).toBeInTheDocument();
  });
});
