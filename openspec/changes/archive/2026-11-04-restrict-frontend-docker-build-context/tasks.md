## 1. Limitar el empaquetado

- [x] 1.1 Sustituir `COPY . .` en `frontend/Dockerfile` por las copias explícitas definidas en el diseño, conservando la instalación con lockfile, la imagen base, el comando de Vite y el puerto 5173.
- [x] 1.2 Reforzar `frontend/.dockerignore` para excluir configuraciones privadas, claves, metadatos y artefactos locales en raíz y subdirectorios, sin impedir la instalación de dependencias dentro de la imagen.
- [x] 1.3 Actualizar `frontend/README.md` con los recursos admitidos, la configuración por entorno en Docker y el procedimiento para añadir futuros recursos a la imagen.

## 2. Comprobar contexto e imagen

- [x] 2.0 Declarar `@types/geojson` y `@types/topojson-specification` como dependencias de desarrollo directas usando versiones ya resueltas, sincronizar el lockfile y verificar la instalación congelada; ampliación autorizada para corregir el build limpio previo.

- [x] 2.1 Preparar un contexto temporal aislado con los recursos del frontend y archivos testigo inofensivos para todas las categorías excluidas, en raíz y en ubicaciones anidadas de `src/` y `public/`, además de un archivo raíz ajeno a la selección; evitar copiar secretos reales.
- [x] 2.2 Construir sin caché una imagen auxiliar para inventariar el contexto filtrado y demostrar que los testigos de las categorías excluidas no llegaron al constructor; registrar el procedimiento reproducible.
- [x] 2.3 Construir el Dockerfile real con el contexto aislado y verificar los recursos necesarios presentes, los testigos excluidos ausentes y la ausencia del archivo raíz ajeno en las capas generadas, sin imprimir contenidos privados.
- [x] 2.4 Ejecutar `pnpm run build`, `pnpm run lint` y `pnpm test` en la imagen resultante; registrar resultados y distinguir cualquier fallo previo de una regresión del empaquetado.

## 3. Verificar la integración y registrar evidencia

- [x] 3.1 Iniciar un contenedor temporal de la imagen en un puerto disponible con acceso al backend integrado y `VITE_API_TARGET` por entorno; comprobar página inicial, una ruta del SPA, recursos públicos y GET de `/api/v1/config` a través del proxy, sin recrear PostgreSQL ni modificar datos.
- [x] 3.2 Retirar solo los recursos temporales de las comprobaciones y registrar en `evidence.md` comandos, resultados, límites y archivos afectados, sin incorporar credenciales ni archivos testigo al repositorio.
- [ ] 3.3 Cuando se publique una PR autorizada, verificar CI y el análisis Sonar de su revisión exacta; registrar el estado del hallazgo del Dockerfile y atender cualquier observación restante sin suprimir el análisis. No marcar esta tarea completa solo con comprobaciones locales.
