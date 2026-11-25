## MODIFIED Requirements

### Requirement: Área de contenido principal
La aplicación SHALL renderizar un área de contenido a la derecha del sidebar donde se monte el dashboard público o cada pantalla administrativa según la ruta activa. La ruta raíz `/` MUST renderizar el landing público sin redirigir a otra pantalla. `/dashboard` SHALL montar el shell y su contenido analítico con o sin sesión; las rutas administrativas SHALL montar sus pantallas únicamente después de confirmar una sesión activa. `/sign-in` SHALL renderizarse fuera del shell.

#### Scenario: Acceder a la raíz de la aplicación
- **WHEN** el usuario navega a `/`
- **THEN** la aplicación muestra el landing público sin exigir autenticación

#### Scenario: Montar una pantalla administrativa autenticada
- **WHEN** el administrador autenticado navega a una ruta administrativa
- **THEN** la aplicación monta esa pantalla dentro del área de contenido del shell

#### Scenario: Montar el dashboard sin sesión
- **WHEN** una persona navega a `/dashboard` sin una sesión activa
- **THEN** la aplicación monta el dashboard completo dentro del shell con su navegación pública

#### Scenario: Mostrar el inicio de sesión
- **WHEN** una persona navega a `/sign-in`
- **THEN** la aplicación muestra el inicio de sesión fuera del shell administrativo

## ADDED Requirements

### Requirement: Identidad y cierre de sesión en el shell
Cuando exista una sesión activa, el shell SHALL identificarla mediante el correo de la cuenta y SHALL ofrecer una acción visible de cierre de sesión. Al cerrar la sesión MUST desmontar cualquier contenido administrativo, navegar o permanecer en `/dashboard` y mostrar inmediatamente la presentación pública del shell.

#### Scenario: Mostrar la cuenta activa
- **WHEN** el administrador abre cualquier pantalla del shell
- **THEN** el shell muestra el correo asociado a su sesión activa

#### Scenario: Salir desde el shell
- **WHEN** el administrador activa el cierre de sesión desde el shell
- **THEN** la aplicación termina la sesión, desmonta el contenido protegido y muestra `/dashboard` con navegación pública

### Requirement: Navegación coherente con el estado de acceso
El shell SHALL conservar la identidad visual, estructura y comportamiento adaptable existentes tanto en su presentación pública como administrativa. Sin sesión, SHALL mostrar la navegación de análisis y una única acción de acceso administrativo, y MUST NOT mostrar los enlaces de Fuentes, Diccionario ni Parámetros. Con una sesión activa, SHALL conservar el mismo dashboard y revelar esos módulos administrativos sin cambiar la URL ni reemplazar el contenido analítico.

#### Scenario: Mostrar navegación pública en el dashboard
- **WHEN** una persona sin sesión visita `/dashboard`
- **THEN** el sidebar muestra el Dashboard de humor y una acción de acceso administrativo, sin mostrar los módulos de gestión

#### Scenario: Ampliar la navegación después de autenticar
- **WHEN** el administrador completa el acceso desde `/dashboard`
- **THEN** vuelve a `/dashboard` y el mismo shell revela Fuentes y canales, Diccionario, Parámetros, la cuenta activa y el cierre de sesión

#### Scenario: Mantener coherencia visual entre estados
- **WHEN** el shell cambia entre su presentación pública y administrativa
- **THEN** conserva la marca, colores, tipografía, estructura y comportamiento adaptable existentes
