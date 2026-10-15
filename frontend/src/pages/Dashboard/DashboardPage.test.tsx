import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardPage } from "./DashboardPage";
import {
  fetchDashboard,
  fetchInfluentialTerms,
} from "../../features/dashboard/infrastructure/dashboardApi";
import type {
  DashboardData,
  InfluentialTermsData,
} from "../../features/dashboard/domain/dashboard";

vi.mock("../../features/dashboard/infrastructure/dashboardApi", () => ({
  fetchDashboard: vi.fn(),
  fetchInfluentialTerms: vi.fn(),
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
    mockedFetchInfluentialTerms.mockResolvedValue(mockTermsResponse);
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
      expect(screen.getByText(/caducidad 30 d.as/i)).toBeInTheDocument();
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

  // Noticias placeholder
  it("renders Noticias mas influyentes placeholder card", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/Noticias m.s influyentes/)).toBeInTheDocument();
    });
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