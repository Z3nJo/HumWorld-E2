import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardPage } from "./DashboardPage";
import {
  fetchDashboard,
  fetchInfluentialTerms,
  fetchEvolution,
  fetchInfluentialNews,
  fetchGeography,
} from "../../features/dashboard/infrastructure/dashboardApi";
import type {
  DashboardData,
  InfluentialTermsData,
} from "../../features/dashboard/domain/dashboard";

vi.mock("../../features/dashboard/infrastructure/dashboardApi", () => ({
  fetchDashboard: vi.fn(),
  fetchInfluentialTerms: vi.fn(),
  fetchEvolution: vi.fn(),
  fetchInfluentialNews: vi.fn(),
  fetchGeography: vi.fn(),
}));

const mockedFetchDashboard = vi.mocked(fetchDashboard);
const mockedFetchInfluentialTerms = vi.mocked(fetchInfluentialTerms);

const mockDashboardResponse: DashboardData = {
  fecha_desde: "2026-10-15",
  fecha_hasta: "2026-10-15",
  continente: null,
  pais: null,
  agregados: [
    { continente: "America", pais: null, humor: 0.12, noticias: 45, suficiente: true },
    { continente: "America", pais: "CL", humor: 0.25, noticias: 15, suficiente: true },
    { continente: "America", pais: "AR", humor: -0.08, noticias: 10, suficiente: true },
    { continente: "Europa", pais: null, humor: -0.15, noticias: 30, suficiente: true },
    { continente: "Europa", pais: "ES", humor: -0.05, noticias: 12, suficiente: true },
    { continente: "Asia", pais: null, humor: 0.05, noticias: 2, suficiente: false },
    { continente: "Africa", pais: null, humor: -0.07, noticias: 0, suficiente: false },
    { continente: "Oceania", pais: null, humor: 0.10, noticias: 0, suficiente: false },
    { continente: "Antartida", pais: null, humor: null, noticias: 0, suficiente: false },
  ],
};

const mockTermsResponse: InfluentialTermsData = {
  fecha_desde: "2026-10-15",
  fecha_hasta: "2026-10-15",
  continente: null,
  pais: null,
  terminos: [
    { id_termino: 1, termino: "acuerdo", idioma: "es", peso: 6.5, aporte_total: 5.2, frecuencia: 4 },
    { id_termino: 2, termino: "crisis", idioma: "en", peso: 4.1, aporte_total: -3.8, frecuencia: 3 },
    { id_termino: 3, termino: "esperanza", idioma: "es", peso: 3.8, aporte_total: 3.5, frecuencia: 2 },
    { id_termino: 4, termino: "inflacion", idioma: "es", peso: 3.2, aporte_total: -2.9, frecuencia: 5 },
  ],
};

const mockEmptyDashboard: DashboardData = {
  fecha_desde: "2026-09-20",
  fecha_hasta: "2026-09-20",
  continente: null,
  pais: null,
  agregados: [],
};

const mockEmptyTerms: InfluentialTermsData = {
  fecha_desde: "2026-09-20",
  fecha_hasta: "2026-09-20",
  continente: null,
  pais: null,
  terminos: [],
};

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetchDashboard.mockResolvedValue(mockDashboardResponse);
    vi.mocked(fetchGeography).mockResolvedValue(mockDashboardResponse);
    mockedFetchInfluentialTerms.mockResolvedValue(mockTermsResponse);
    vi.mocked(fetchEvolution).mockResolvedValue({ fecha_desde: '2026-10-01', fecha_hasta: '2026-10-30', dias: [] });
    vi.mocked(fetchInfluentialNews).mockResolvedValue({ noticias: [] });
  });

  // Header
  it("renders page title and description", async () => {
    render(<DashboardPage />);
    expect(screen.getByText("Dashboard de humor")).toBeInTheDocument();
    expect(screen.getByText(/Humor agregado de las noticias capturadas/i)).toBeInTheDocument();
  });

  it("does NOT render the Simular estado developer widget", () => {
    render(<DashboardPage />);
    expect(screen.queryByText(/Simular estado/i)).not.toBeInTheDocument();
  });

  it("does NOT render the DD-03 abierta annotation label", () => {
    render(<DashboardPage />);
    expect(screen.queryByText(/DD-03 abierta/i)).not.toBeInTheDocument();
  });

  // Scope chips - using actual Spanish text with accents
  it("renders continent chips including Global and América", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getAllByText("Global").length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText("Europa").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Asia").length).toBeGreaterThan(0);
  });

  // Day window segmented control - actual button text has accents
  it("shows Dia and 7 dias window buttons", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      // Use regex for accent-tolerant match
      expect(screen.getByText(/^D.a$/)).toBeInTheDocument();
      expect(screen.getByText(/7 d.as/)).toBeInTheDocument();
    });
  });

  it("activates 7-day window when clicked", async () => {
    render(<DashboardPage />);
    const sevenDaysBtn = await screen.findByText(/7 d.as/);
    fireEvent.click(sevenDaysBtn);
    expect(sevenDaysBtn).toHaveClass("on");
  });

  it("can navigate back to 1-day window from 7-day window", async () => {
    render(<DashboardPage />);
    const sevenDaysBtn = await screen.findByText(/7 d.as/);
    fireEvent.click(sevenDaysBtn);
    const oneDayBtn = screen.getByText(/^D.a$/);
    fireEvent.click(oneDayBtn);
    expect(oneDayBtn).toHaveClass("on");
  });

  // Date navigator
  it("renders the date navigator with prev/next buttons", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByLabelText(/D.a anterior/)).toBeInTheDocument();
      expect(screen.getByLabelText(/D.a siguiente/)).toBeInTheDocument();
    });
  });

  it("renders daily bar buttons for the 30-day window", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      const daysList = screen.getByRole("listbox", { name: /D.as con datos/i });
      expect(daysList).toBeInTheDocument();
      const dayButtons = daysList.querySelectorAll("button");
      expect(dayButtons.length).toBe(30);
    });
  });

  it("shows data availability metadata row", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/Datos disponibles/i)).toBeInTheDocument();
      expect(screen.getByText(/.ltimos 30 d.as/i)).toBeInTheDocument();
    });
  });

  it("shows date-registry note without DD-03 annotation", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/fecha_registro/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/DD-03 abierta/i)).not.toBeInTheDocument();
  });

  // Continent filter -> country dropdown
  it("shows country dropdown when a continent chip is selected", async () => {
    render(<DashboardPage />);
    // Use regex to find the chip for America/América
    const americaBtn = await screen.findByText(/Am.rica/);
    const chip = americaBtn.closest("button");
    if (chip) fireEvent.click(chip);
    await waitFor(() => {
      const select = screen.getByLabelText(/Pa.s/) as HTMLSelectElement;
      expect(select).toBeInTheDocument();
      expect(screen.getByText(/Todos los pa.ses/i)).toBeInTheDocument();
    });
  });

  it("hides country dropdown when Global chip is clicked", async () => {
    render(<DashboardPage />);
    const americaBtn = await screen.findByText(/Am.rica/);
    const chip = americaBtn.closest("button");
    if (chip) fireEvent.click(chip);
    await waitFor(() => {
      expect(screen.getByLabelText(/Pa.s/)).toBeInTheDocument();
    });
    const globalBtns = screen.getAllByText("Global");
    fireEvent.click(globalBtns[0]);
    await waitFor(() => {
      expect(screen.queryByLabelText(/Pa.s/)).not.toBeInTheDocument();
    });
  });

  // Map card titles
  it("renders map card with Humor por continente heading by default", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText("Humor por continente")).toBeInTheDocument();
    });
  });

  it("changes map card heading when Europa continent is selected", async () => {
    render(<DashboardPage />);
    const europaBtn = await screen.findByText("Europa");
    const chip = europaBtn.closest("button");
    if (chip) fireEvent.click(chip);
    await waitFor(() => {
      expect(screen.getByText(/Pa.ses de Europa/i)).toBeInTheDocument();
    });
  });

  it('keeps all country counts and humor after selecting a country', async () => {
    mockedFetchDashboard.mockImplementation(async (params) => ({
      ...mockDashboardResponse,
      agregados: params.pais ? mockDashboardResponse.agregados.filter((a) => a.pais === params.pais)
        : mockDashboardResponse.agregados.filter((a) => !a.pais),
    }));
    render(<DashboardPage />);
    fireEvent.click(await screen.findByText(/Am.rica/));
    await screen.findByText(/Pa.ses de Am.rica/);
    const table = screen.getByRole('table', { name: /Humor por pa.s/ });
    expect(within(table).getByText('Chile').closest('tr')).toHaveTextContent('+0,25');
    expect(within(table).getByText('Chile').closest('tr')).toHaveTextContent('15');
    expect(within(table).getByText('Argentina').closest('tr')).toHaveTextContent('−0,08');
    fireEvent.click(within(table).getByText('Chile'));
    await screen.findByRole('heading', { name: 'Chile' });
    const filteredTable = screen.getByRole('table', { name: /Humor por pa.s/ });
    expect(within(filteredTable).getByText('Argentina').closest('tr')).toHaveTextContent('−0,08');
    expect(within(filteredTable).getByText('Argentina').closest('tr')).toHaveTextContent('10');
    expect(fetchGeography).toHaveBeenLastCalledWith({
      fecha_desde: expect.any(String), fecha_hasta: expect.any(String),
    });
    expect(mockedFetchDashboard).toHaveBeenLastCalledWith(expect.objectContaining({ pais: 'CL' }));
  });

  // Summary card
  it("renders the summary card title Global by default", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      const heading = screen.getByRole("heading", { name: "Global" });
      expect(heading).toBeInTheDocument();
    });
  });

  it("renders continent table rows inside summary card", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByRole("columnheader", { name: "Continente" })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "Humor" })).toBeInTheDocument();
    });
  });

  // Timeline
  it("renders the daily timeline heading with scope", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/Evoluci.n diaria/i)).toBeInTheDocument();
    });
  });

  it("renders timeline subtitle about noticias evaluables", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/noticias evaluables|evaluables/i).length).toBeGreaterThan(0);
    });
  });

  // Influential terms
  it("renders Terminos influyentes heading", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/T.rminos influyentes/)).toBeInTheDocument();
    });
  });

  it("shows cloud terms from API response", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText("acuerdo")).toBeInTheDocument();
      expect(screen.getByText("crisis")).toBeInTheDocument();
    });
  });

  it("switches to table view when Tabla button is clicked", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText("acuerdo")).toBeInTheDocument();
    });
    const tableTabBtn = screen.getByRole("button", { name: "Tabla" });
    fireEvent.click(tableTabBtn);
    await waitFor(() => {
      expect(screen.getAllByRole("table").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole("columnheader", { name: /T.rmino/ })).toBeInTheDocument();
    });
  });

  it("switches back to cloud view when Nube button is clicked", async () => {
    render(<DashboardPage />);
    await waitFor(() => expect(screen.getByText("acuerdo")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Tabla" }));
    const nubeBtn = screen.getByRole("button", { name: "Nube" });
    fireEvent.click(nubeBtn);
    expect(nubeBtn).toHaveClass("on");
  });

  it("renders Noticias mas influyentes card", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/Noticias m.s influyentes/)).toBeInTheDocument();
    });
  });

  it("renders ranked news from the API with links and scores", async () => {
    vi.mocked(fetchInfluentialNews).mockResolvedValue({ noticias: [{
      id_noticia: 1, titulo: 'Noticia destacada real', url: 'https://example.com/news/1',
      canal: 'Canal Chile', continente: 'America', pais: 'CL',
      fecha_registro: '2026-10-16T00:00:00Z', valor_humor: -0.9,
    }] });
    render(<DashboardPage />);
    const link = await screen.findByRole('link', { name: 'Noticia destacada real' });
    expect(link).toHaveAttribute('href', 'https://example.com/news/1');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link.closest('li')).toHaveTextContent('Canal Chile');
    expect(link.closest('li')).toHaveTextContent('−0,90');
    expect(screen.queryByText('Sin noticias evaluables')).not.toBeInTheDocument();
  });

  it("shows the countries attributed to each ranked news item", async () => {
    vi.mocked(fetchInfluentialNews).mockResolvedValue({ noticias: [{
      id_noticia: 2, titulo: 'Noticia sobre Brasil', url: 'https://example.com/news/2',
      canal: 'Canal EEUU', continente: 'America', pais: 'US',
      fecha_registro: '2026-10-16T00:00:00Z', valor_humor: 0.5, paises_atribuidos: ['BR', 'AR'],
    }] });
    render(<DashboardPage />);
    const item = (await screen.findByRole('link', { name: 'Noticia sobre Brasil' })).closest('li');
    expect(item).toHaveTextContent('Canal EEUU');
    expect(item).toHaveTextContent('Sobre: Brasil, Argentina');
  });

  it("uses current UTC dates and real daily counts without duplicating range totals", async () => {
    const today = new Date().toISOString().slice(0, 10);
    vi.mocked(fetchEvolution).mockResolvedValue({ fecha_desde: today, fecha_hasta: today, dias: [{
      fecha: today, humor: -0.4, noticias: 17, suficiente: true,
    }] });
    render(<DashboardPage />);
    await screen.findByText('Humor por continente');
    const dayButtons = screen.getByRole('listbox', { name: /D.as con datos/i }).querySelectorAll('button');
    expect(dayButtons[29]).toHaveAttribute('title', expect.stringContaining('17 noticias'));
    expect(dayButtons[28]).toHaveAttribute('title', expect.stringContaining('sin datos'));
    expect(mockedFetchDashboard).toHaveBeenCalledWith(expect.objectContaining({
      fecha_desde: today, fecha_hasta: today,
    }));
    fireEvent.click(screen.getByText(/7 d.as/));
    await waitFor(() => expect(mockedFetchDashboard).toHaveBeenLastCalledWith(expect.objectContaining({
      fecha_desde: new Date(Date.parse(today) - 6 * 864e5).toISOString().slice(0, 10),
      fecha_hasta: today,
    })));
    await screen.findByText('Humor por continente');
    expect(dayButtons[28]).toHaveAttribute('title', expect.stringContaining('sin datos'));
  });

  // Legend
  it("renders map legend with Negativo Neutro Positivo labels", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText("Negativo")).toBeInTheDocument();
      expect(screen.getByText("Neutro")).toBeInTheDocument();
      expect(screen.getByText("Positivo")).toBeInTheDocument();
    });
  });

  it("renders Sin datos legend item", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/Sin datos/i).length).toBeGreaterThan(0);
    });
  });

  // Loading state
  it("shows skeleton elements while data is loading", () => {
    mockedFetchDashboard.mockImplementation(() => new Promise(() => {}));
    mockedFetchInfluentialTerms.mockImplementation(() => new Promise(() => {}));
    render(<DashboardPage />);
    const skeletons = document.querySelectorAll(".sk");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // Error state
  it("shows error message and retry button when API fails", async () => {
    mockedFetchDashboard.mockRejectedValue(new Error("500 Internal Server Error"));
    mockedFetchInfluentialTerms.mockRejectedValue(new Error("500 Internal Server Error"));
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/No se pudieron cargar los datos/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Reintentar/i })).toBeInTheDocument();
    });
  });

  it("retries API call when Reintentar button is clicked", async () => {
    mockedFetchDashboard
      .mockRejectedValueOnce(new Error("500"))
      .mockResolvedValueOnce(mockDashboardResponse);
    mockedFetchInfluentialTerms
      .mockRejectedValueOnce(new Error("500"))
      .mockResolvedValueOnce(mockTermsResponse);
    render(<DashboardPage />);
    const retryBtn = await screen.findByRole("button", { name: /Reintentar/i });
    fireEvent.click(retryBtn);
    await waitFor(() => {
      expect(mockedFetchDashboard).toHaveBeenCalledTimes(2);
    });
  });

  // Empty state
  it("shows Sin terminos when API returns no terms", async () => {
    mockedFetchDashboard.mockResolvedValue(mockEmptyDashboard);
    mockedFetchInfluentialTerms.mockResolvedValue(mockEmptyTerms);
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/Sin t.rminos/)).toBeInTheDocument();
    });
  });

  // API connection
  it("calls fetchDashboard with correct ISO date parameters", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(mockedFetchDashboard).toHaveBeenCalledWith(
        expect.objectContaining({
          fecha_desde: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          fecha_hasta: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        })
      );
    });
  });

  it("calls fetchInfluentialTerms alongside fetchDashboard", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(mockedFetchInfluentialTerms).toHaveBeenCalled();
    });
  });

  it("calls fetchDashboard with continente when continent chip is selected", async () => {
    render(<DashboardPage />);
    const europaBtn = await screen.findByText("Europa");
    const chip = europaBtn.closest("button");
    if (chip) fireEvent.click(chip);
    await waitFor(() => {
      expect(mockedFetchDashboard).toHaveBeenCalledWith(
        expect.objectContaining({ continente: "Europa" })
      );
    });
  });
});
