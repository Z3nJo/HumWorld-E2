import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppShell } from './AppShell';

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
    expect(screen.getByRole('link', { name: /Fuentes y canales/i })).toHaveAttribute(
      'href',
      '/fuentes',
    );
  });
});
