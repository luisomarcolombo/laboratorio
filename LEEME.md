# Laboratorio de vida de anaquel en Cloudflare Pages

Página del laboratorio con ranking en vivo guardado en una base de datos de Cloudflare (D1). Los equipos no necesitan cuenta de Claude ni de Cloudflare: solo abren el enlace.

## Qué hay en esta carpeta

| Archivo | Para qué sirve |
| --- | --- |
| `public/index.html` | La aplicación completa (simulador, ensayos, modelos, decisión, ranking). |
| `public/_routes.json` | Hace que solo `/api/*` use la función; el resto se sirve como página estática. |
| `functions/api/ranking.js` | API del ranking: leer, publicar y borrar resultados en D1. Crea la tabla sola la primera vez. |
| `schema.sql` | La tabla, por si prefiere crearla a mano (opcional). |
| `wrangler.toml` | Configuración para la opción B (línea de comandos). |

**Importante:** la opción de "arrastrar y soltar" archivos del panel de Cloudflare no instala la carpeta `functions`, así que con ella el ranking en vivo no funcionaría. Use la opción A o la B.

## Opción A: sin instalar nada (GitHub + panel de Cloudflare)

1. **Suba el proyecto a GitHub.** Cree un repositorio nuevo (puede ser privado). Con "Add file > Upload files", arrastre las carpetas `public` y `functions` y los demás archivos, conservando la estructura de carpetas.
2. **Cree el proyecto de Pages.** En el panel de Cloudflare: Workers & Pages > Create > Pages > conectar con Git, y elija el repositorio. Configuración de compilación:
   - Framework preset: ninguno.
   - Build command: vacío.
   - Build output directory: `public`.
3. **Cree la base de datos.** En el panel: Storage & Databases > D1 > Create. Nombre sugerido: `laboratorio-ranking`.
4. **Conecte la base al proyecto.** En su proyecto de Pages: Settings > Bindings > Add > D1 database. Nombre de la variable: `DB` (exactamente así, en mayúsculas). Elija la base `laboratorio-ranking`.
5. **Agregue los códigos.** En Settings > Variables and Secrets, agréguelos como secretos:
   - `ADMIN_CODE`: su código de docente para borrar el ranking de un grupo. Sin él, nadie puede borrar.
   - `CLASS_CODE` (opcional): código que los equipos deben escribir para publicar. Evita que personas ajenas a la clase llenen el ranking.
6. **Vuelva a desplegar.** Los cambios de los pasos 4 y 5 aplican en el siguiente despliegue: en Deployments, elija el último y presione "Retry deployment".
7. **Compruebe.** Abra `https://SU-PROYECTO.pages.dev/api/ranking`. Debe ver algo como `{"grupo":"general","requiereCodigo":true,"entradas":[]}`. Si dice "Falta conectar la base de datos D1", revise el paso 4 y repita el 6.

Los nombres de los menús de Cloudflare pueden cambiar un poco con el tiempo; las piezas siempre son las mismas: proyecto de Pages, base D1 conectada como `DB` y los secretos.

## Opción B: con la línea de comandos (Wrangler)

Requiere Node.js instalado. Desde esta carpeta:

```bash
npx wrangler login
npx wrangler d1 create laboratorio-ranking
# Copie el database_id que aparece y péguelo en wrangler.toml
npx wrangler pages deploy
npx wrangler pages secret put ADMIN_CODE --project-name laboratorio-vida-anaquel
npx wrangler pages secret put CLASS_CODE --project-name laboratorio-vida-anaquel
npx wrangler pages deploy
```

El último `deploy` aplica los secretos. Si quiere crear la tabla a mano: `npx wrangler d1 execute laboratorio-ranking --remote --file=schema.sql`.

## Uso en clase

- **Un ranking por grupo:** agregue `?grupo=` al enlace. Por ejemplo, `https://SU-PROYECTO.pages.dev/?grupo=7A-2026`. Cada grupo ve solo su propio ranking. Sin ese parámetro, el grupo es `general`.
- **Código de la clase:** si configuró `CLASS_CODE`, aparece un campo "Código de la clase" junto al nombre del equipo. Escriba el código en el pizarrón al iniciar.
- **Publicación:** al revelar el resultado en la etapa Decidir, el puntaje se publica solo. El ranking se actualiza cada 10 segundos y muestra el mejor puntaje de cada equipo por escenario. Si falla la conexión, aparece el botón "Publicar mi resultado" para reintentar.
- **Borrar un grupo:** active "Modo docente", vaya a Resultados, escriba su `ADMIN_CODE` y presione "Borrar el ranking en línea de este grupo". Úselo antes de cada clase si reutiliza el mismo nombre de grupo.
- **Sin internet:** si abre `index.html` directo desde la computadora, la app funciona completa, pero el ranking queda solo en ese navegador. Para ese caso sirve el respaldo de copiar y pegar resultados.

## Límites y cuidados

- **El puntaje se calcula en el navegador.** Un alumno con conocimientos técnicos podría enviar un puntaje falso. El código de clase evita intrusos externos, no trampas internas. Para calificar, use también la bitácora y la justificación de cada equipo.
- **"Modo docente" lo ve cualquiera.** Solo desbloquea etapas, no da permisos; borrar el ranking siempre pide `ADMIN_CODE`.
- **Datos personales:** solo se guarda el nombre del equipo, el escenario, el puntaje, el envase y el modelo. Pida a los equipos que no usen nombres completos de alumnos.
- **Costo:** el uso de una clase cabe con holgura en el plan gratuito de Cloudflare para Pages y D1.
- **Datos ilustrativos:** los materiales y productos traen valores típicos de literatura. Se pueden editar o cargar por CSV en "Ayuda y datos", pero esos cambios solo aplican en la pantalla de quien los hace y se pierden al recargar la página.
