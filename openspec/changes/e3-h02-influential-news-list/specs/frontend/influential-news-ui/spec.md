## Purpose

Presentar en el dashboard de humor el top 10 de noticias influyentes del filtro vigente, respetando el orden definido por el backend, y permitir consultar el detalle de cada noticia.

## ADDED Requirements

### Requirement: Mostrar el top 10 del filtro vigente

La sección "Noticias más influyentes" del dashboard SHALL consultar `GET /api/v1/dashboards/noticias-influyentes` con el mismo rango de fechas, `continente` y `pais` que el resto del dashboard. SHALL mostrar como máximo 10 noticias en el mismo orden recibido, sin reordenarlas ni filtrarlas en el cliente, y SHALL mostrar la posición de cada noticia (1 a 10), su titular, su canal y su valor de humor.

#### Scenario: Mostrar el ranking recibido

- **WHEN** la API devuelve noticias para el filtro vigente
- **THEN** la sección muestra cada noticia en el orden recibido con su posición, titular, canal y valor de humor

#### Scenario: Conservar el orden del backend

- **WHEN** la API devuelve una noticia positiva de menor intensidad antes que una negativa de mayor intensidad
- **THEN** la sección las muestra en ese mismo orden

#### Scenario: Actualizar al cambiar el filtro

- **WHEN** el usuario cambia el día, la ventana, el continente o el país del dashboard
- **THEN** la sección vuelve a consultar el ranking con el nuevo filtro y muestra el resultado recibido

#### Scenario: Indicar el ámbito aplicado

- **WHEN** la sección muestra el ranking
- **THEN** su encabezado indica el ámbito vigente (Global, continente o país)

### Requirement: Representar la intensidad con signo visible

Cada noticia SHALL mostrar su `valor_humor` con signo explícito (`+`, `−` o `±`) y SHALL distinguir visualmente las noticias positivas, negativas y neutras mediante color y texto, sin depender solo del color.

#### Scenario: Noticia negativa

- **WHEN** una noticia tiene `valor_humor` negativo
- **THEN** su valor se muestra con signo `−` y con la representación de polaridad negativa

#### Scenario: Noticia positiva

- **WHEN** una noticia tiene `valor_humor` positivo
- **THEN** su valor se muestra con signo `+` y con la representación de polaridad positiva

### Requirement: Acceder al detalle de cada noticia

Cada noticia del ranking SHALL poder abrir su detalle dentro del dashboard mediante un control accesible por teclado. El detalle SHALL mostrar el titular completo, el valor de humor con signo y su polaridad, la fecha y hora de registro en UTC, el canal y la procedencia editorial. Cuando la URL use el esquema `http` o `https`, el detalle SHALL ofrecer un enlace a la noticia original que se abra en una pestaña nueva sin dar acceso a la ventana de origen; en otro caso SHALL indicar que el enlace original no está disponible.

#### Scenario: Abrir el detalle

- **WHEN** el usuario activa una noticia del ranking
- **THEN** se muestra su detalle con titular, valor de humor, polaridad, fecha de registro UTC, canal y procedencia editorial
- **AND** el control indica que el detalle está expandido

#### Scenario: Cerrar el detalle

- **WHEN** el usuario vuelve a activar una noticia con el detalle abierto
- **THEN** el detalle se oculta

#### Scenario: Abrir la noticia original

- **WHEN** el detalle corresponde a una noticia con URL `https://...`
- **THEN** el detalle contiene un enlace a esa URL que se abre en una pestaña nueva con `rel="noopener noreferrer"`

#### Scenario: URL no navegable

- **WHEN** la URL de la noticia no usa el esquema `http` ni `https`
- **THEN** el detalle no contiene un enlace navegable
- **AND** indica que el enlace original no está disponible

### Requirement: Identificar la procedencia editorial

La interfaz SHALL presentar `canal`, `continente` y `pais` de cada noticia como procedencia editorial de la fuente y MUST NOT presentarlos como el país o continente mencionado por la noticia. Cuando `pais` sea nulo SHALL mostrar el continente de la fuente.

#### Scenario: Fuente con país

- **WHEN** una noticia tiene canal con `pais` informado
- **THEN** el detalle muestra el canal y el país bajo la etiqueta de fuente

#### Scenario: Fuente sin país

- **WHEN** una noticia tiene `pais` nulo
- **THEN** el detalle muestra el canal y el continente bajo la etiqueta de fuente

### Requirement: Estado sin candidatas

Cuando la API devuelva `noticias: []`, la sección SHALL mostrar un estado vacío que explique que no hay noticias evaluables para el filtro vigente y sugiera cambiar el día o ampliar el ámbito.

#### Scenario: Filtro sin noticias

- **WHEN** la API responde `200` con `noticias: []`
- **THEN** la sección muestra el estado vacío y ningún elemento de ranking
