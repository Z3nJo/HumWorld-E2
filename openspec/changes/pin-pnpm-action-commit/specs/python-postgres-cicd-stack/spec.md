## ADDED Requirements

### Requirement: Preparación de pnpm mediante una acción fijada a commit

El workflow de CI SHALL referenciar todos sus usos de `pnpm/action-setup` mediante un mismo SHA completo de commit de 40 caracteres hexadecimales cuya procedencia se haya verificado en el repositorio oficial. MUST NOT usar etiquetas, ramas o SHA abreviados para esos pasos. La versión de la acción correspondiente SHALL quedar identificada mediante un comentario junto a cada referencia.

El cambio SHALL conservar la preparación de pnpm desde `packageManager` de `frontend/package.json` y la ejecución de los chequeos existentes. Las futuras actualizaciones de esa acción SHALL revisar la nueva revisión oficial y actualizar conjuntamente las referencias y sus comentarios.

#### Scenario: Preparar pnpm antes de lint y pruebas
- **WHEN** GitHub Actions ejecuta los pasos que preparan pnpm para los chequeos frontend
- **THEN** ambos utilizan el mismo SHA completo de un commit verificado del repositorio oficial de la acción
- **AND** conservan `package_json_file: frontend/package.json`
- **AND** se ejecutan lint y las pruebas con la versión de pnpm declarada por el proyecto

#### Scenario: Desplazar una etiqueta del proveedor
- **WHEN** el proveedor modifica la referencia de una etiqueta después de fijar el workflow
- **THEN** ese movimiento no cambia el commit de la acción seleccionado por el workflow

#### Scenario: Actualizar la acción de forma explícita
- **WHEN** se decide actualizar la acción instaladora de pnpm
- **THEN** se verifica el commit nuevo en el repositorio oficial y se actualizan juntos los SHA y comentarios de todos sus usos en el workflow
