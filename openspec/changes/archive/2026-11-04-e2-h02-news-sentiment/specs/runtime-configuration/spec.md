# Spec Delta

## ADDED Requirements

### Requirement: Parámetros persistidos del humor
El sistema SHALL disponer en `CONFIGURACION` de `humor.formula_noticia` como texto `promedio_ponderado`, `humor.escala_maxima` como decimal `10`, `humor.minimo_noticias_agregacion` como entero `3` y `humor.saturacion_suma` como entero `5`, con descripciones legibles. SHALL resolverlos y validar sus valores antes de pasarlos al motor. Esta capacidad no modifica la forma vigente de `GET` o `PUT /api/v1/config`.

#### Scenario: Inicializar la configuración de humor
- **WHEN** se prepara una base de datos limpia mediante el seed de configuración
- **THEN** existen las cuatro claves con tipos, descripciones y valores por defecto definidos en ADR-001

#### Scenario: Resolver una fórmula distinta
- **WHEN** `humor.formula_noticia` tiene otro valor admitido antes de analizar una noticia
- **THEN** el análisis usa esa fórmula sin recompilar el backend

#### Scenario: Rechazar parámetros inválidos
- **WHEN** un parámetro de humor persistido contiene una fórmula desconocida, una escala no positiva, un mínimo de noticias no positivo o una saturación no positiva
- **THEN** el sistema informa un error de configuración y no confirma un análisis con un valor inválido

#### Scenario: Advertir una discrepancia de escala
- **WHEN** al arrancar existen términos y la escala configurada difiere del mayor valor absoluto presente en el diccionario
- **THEN** el sistema registra una advertencia conforme a ADR-001
