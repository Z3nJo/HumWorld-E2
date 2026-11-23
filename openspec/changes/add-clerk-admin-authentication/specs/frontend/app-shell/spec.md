## MODIFIED Requirements

### Requirement: Área de contenido principal
La aplicación SHALL renderizar un área de contenido a la derecha del sidebar donde se monte cada pantalla administrativa según la ruta activa. La ruta raíz `/` MUST renderizar el landing público sin redirigir a una pantalla administrativa. Las rutas administrativas SHALL montar el shell únicamente después de confirmar una sesión activa; `/sign-in` SHALL renderizarse fuera del shell administrativo.

#### Scenario: Acceder a la raíz de la aplicación
- **WHEN** el usuario navega a `/`
- **THEN** la aplicación muestra el landing público sin exigir autenticación

#### Scenario: Montar una pantalla administrativa autenticada
- **WHEN** el administrador autenticado navega a una ruta administrativa
- **THEN** la aplicación monta esa pantalla dentro del área de contenido del shell

#### Scenario: Mostrar el inicio de sesión
- **WHEN** una persona navega a `/sign-in`
- **THEN** la aplicación muestra el inicio de sesión fuera del shell administrativo

## ADDED Requirements

### Requirement: Identidad y cierre de sesión en el shell
El shell administrativo SHALL identificar la sesión activa mediante el correo de la cuenta y SHALL ofrecer una acción visible de cierre de sesión. Al cerrar la sesión MUST desmontar el contenido administrativo y navegar al landing público.

#### Scenario: Mostrar la cuenta activa
- **WHEN** el administrador abre cualquier pantalla del shell
- **THEN** el shell muestra el correo asociado a su sesión activa

#### Scenario: Salir desde el shell
- **WHEN** el administrador activa el cierre de sesión desde el shell
- **THEN** la aplicación termina la sesión, desmonta el contenido protegido y navega a `/`
