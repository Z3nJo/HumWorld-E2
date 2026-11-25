import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DashboardLayout, SessionEnhancementBoundary } from './DashboardLayout';

function BrokenEnhancement(): never {
  throw new Error('Clerk no disponible');
}

describe('DashboardLayout', () => {
  it('renders the public dashboard without a Clerk key', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<DashboardLayout publishableKey="" />}>
            <Route path="/dashboard" element={<div>Contenido analítico público</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Contenido analítico público')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Acceso administrativo' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Diccionario/i })).not.toBeInTheDocument();
  });

  it('keeps public content mounted when the optional session enhancement fails', () => {
    const onFailure = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <MemoryRouter>
        <div>Contenido analítico público</div>
        <SessionEnhancementBoundary onFailure={onFailure}>
          <BrokenEnhancement />
        </SessionEnhancementBoundary>
      </MemoryRouter>,
    );

    expect(screen.getByText('Contenido analítico público')).toBeInTheDocument();
    expect(onFailure).toHaveBeenCalledOnce();
  });
});
