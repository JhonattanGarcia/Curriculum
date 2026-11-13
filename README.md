# Curriculum

## Estilos compartidos

`Styles/variables.css` centraliza los colores, la tipografía, los espaciados,
las dimensiones y los valores de animación del portal. La paleta sigue la identidad Editorial Tech: Ink, Warm Ivory y acentos Camel.

Cada hoja de estilos general o de sección debe importarla como primera regla:

```css
@import url("./variables.css");

.resumen {
    color: var(--color-text);
    background: var(--color-paper);
    padding: var(--page-padding);
}
```

Las variables se declaran en `:root` y se heredan en todas las secciones,
incluidos los fragmentos que JavaScript inserte dinámicamente. Los valores
compartidos se modifican en esa hoja; cada componente conserva sus reglas de
presentación en su propio CSS. Los nombres describen su función visual.

El tamaño de títulos y el padding usan `clamp()` para adaptarse al ancho.
Los futuros layouts usarán media queries; las variables CSS nativas no se
pueden utilizar como condiciones de ancho en esas consultas.
Las animaciones deben consumir las duraciones compartidas, que se reducen a
cero cuando está activa la preferencia de movimiento reducido.

## Tipografía

Cargar `Styles/base.css` una sola vez desde el documento principal, antes de
los estilos de componentes y secciones. Esta hoja importa Google Fonts con
`display=swap` y las variables compartidas, y aplica las reglas tipográficas.

- Manrope: títulos.
- Inter: texto y controles.
- IBM Plex Mono: etiquetas técnicas con la clase `.tech-label`.

Las familias alternativas locales se usan mientras las fuentes cargan o si
Google Fonts no está disponible. Los tamaños, pesos, interlineados y espaciados
entre letras se mantienen en `Styles/variables.css`.

## Ejecución en XAMPP / Apache

Abrir http://localhost/SitioWeb%202025/ con Apache iniciado. El proyecto requiere
PHP y mod_rewrite, y AllowOverride debe permitir .htaccess (FileInfo, Indexes y
Options). Apache usa index.php como entrada y index.html como plantilla del
cascarón. No se debe abrir index.html con file:// ni servirlo con un servidor
exclusivamente estático: no ejecutaría las rutas ni el renderizado PHP.

## Arquitectura

- routes.json es la fuente del orden, archivos, etiquetas y rutas públicas.
- index.html conserva encabezado, fondo, viewport, controles y pie.
- index.php inserta el contenido inicial y los metadatos antes de enviarlos.
- main.html contiene Resumen; resumen.html es una copia de referencia y no se usa
  en el enrutamiento. Editar main.html para actualizar la portada.
- formacion_academica.html, experiencia_laboral.html, aboutme.html y contacto.html
  son los otros fragmentos sin documento completo ni scripts embebidos.
- Scripts/script.js coordina carga, historial, caché, precarga y gestos.
- Scripts/transitions.js implementa disolución de texto con partículas y entrada
  suave; la duración visual total es de 500 ms y respeta movimiento reducido.

| Ruta relativa a la raíz del proyecto | Vista |
| --- | --- |
| / | Summary / Resumen |
| /formacion | Education / Formación |
| /experiencia | Experience / Experiencia |
| /about | About Me / Sobre mí |
| /contacto | Contact / Contacto |

La carga dinámica solicita la ruta con ?fragment=1; PHP devuelve solo el
fragmento y X-Portfolio-Fragment: 1. El contenido inicial se reutiliza y no se
vuelve a descargar. La navegación cancela solicitudes y animaciones anteriores.
Los enlaces conservan su destino real, admiten abrir otra pestaña y funcionan
sin JavaScript. Los gestos no usan preventDefault y excluyen bordes de pantalla,
controles y zonas con desplazamiento horizontal; La navegación es cíclica en ambos sentidos: Contacto avanza a Resumen y Resumen retrocede a Contacto, mediante flechas o gestos.

## Indexación y publicación

sitemap.xml y robots.txt se sirven dinámicamente desde PHP con las cinco rutas.
Cada respuesta completa incluye canonical, título, descripción, Open Graph y
Schema.org ProfilePage/Person. No se exige JavaScript para leer el contenido.
En producción, configurar PUBLIC_SITE_URL con la URL HTTPS definitiva, incluida
la subcarpeta si existe. No se ha inventado un dominio de producción.
Si el proyecto se publica en una subcarpeta, el robots.txt del dominio debe
anunciar la URL del sitemap de este proyecto; los buscadores consultan robots
en la raíz del dominio. No se añaden restricciones especiales para crawlers de IA.

La imagen Resources/IMG/Background.webp se conserva sin modificar (285478 bytes).
El degradado oscuro se aplica por CSS. El enlace WhatsApp fue proporcionado por
el propietario: https://wa.me/elJhonnyZ. Está pendiente comprobar en un navegador
que abre el contacto correcto; no se dedujo ningún teléfono del identificador.

El contenido profesional inicial se basa en el CV anterior. Fechas, titulaciones
y certificaciones necesitan revisión del propietario antes de publicación.

## Verificación

Ejecutar `node --test Tests/navigation.test.cjs` para comprobar orden, límites,
historial, caché, cancelación de navegación, errores y gestos simulados.
Se verificaron las cinco rutas y fragmentos contra Apache local. Queda pendiente
la revisión visual de la disolución y las pruebas táctiles en dispositivos reales.

Los controles de sección se presentan como flechas laterales translúcidas con
texto accesible oculto; hover y foco las vuelven opacas. En móvil los bordes
izquierdo y derecho activan anterior y siguiente bajo el encabezado. Con el
menú hamburguesa abierto se ocultan las zonas laterales para evitar cruces.

## Experiencia: gr?ficas y logros

`experiencia_laboral.html` conserva los 18 logros de las dos empresas del CV
anterior. La investigaci?n sobre Replit se destaca con los enlaces originales
al sitio oficial y a LinkedIn. Los logros se renderizan en el servidor y se
pueden leer sin JavaScript.

`Scripts/experiencia_laboral.js` controla dos bloques independientes de barras
horizontales y gráfico circular. «Todos los cargos mostrados» incluye únicamente Appgate y Teleperformance. Los filtros de herramientas muestran únicamente
los cargos correspondientes y cambian el título del total para aclarar su alcance.
La duración se calcula desde las fechas laborales, no desde cifras fijas.

Chart.js 4.5.1 se sirve desde `Scripts/vendor/`, con licencia MIT incluida. Solo
se carga al abrir Experiencia. El cargador central inicializa el m?dulo tras
insertar el fragmento y lo destruye antes de salir para evitar eventos o
instancias duplicadas. Se respetan idioma y movimiento reducido. Los colores
se obtienen de `Styles/variables.css` y el dise?o de `Styles/experiencia_laboral.css`.

Pruebas:

- `node --test Tests/navigation.test.cjs Tests/experience.test.cjs`
- `python Tests/check_fragment_layout.py` con Apache iniciado.
- `node Tests/experience.browser.cjs` con Chrome headless abierto en el puerto
  de depuraci?n local 9239 y un perfil temporal. El script cierra esa instancia
  al terminar. Requiere Node 22; admite `QA_CDP_URL` y `QA_SITE_URL`.

La prueba de navegador comprueba filtros, idioma, destrucci?n/reentrada,
publicaci?n, anchos de 390/320 px, movimiento reducido y ca?da de la biblioteca.
Las capturas se guardan en una carpeta temporal, fuera del repositorio.

## Duración automática de la experiencia

`Resources/experience.json` es la fuente de fechas de las empresas, con precisión
mensual. `end: null` indica empleo activo. Las duraciones y los rangos de fechas
se actualizan en PHP para la primera carga y en JavaScript al navegar. Los
empleos terminados mantienen su duración; no hay que editar cifras cada año.

Los totales suman meses exactos y se muestran en años y meses. Las gráficas usan
meses / 12 y amplían automáticamente el eje si hace falta. El calendario sigue
America/Bogota; la pestaña abierta detecta cambios de mes y limpia su temporizador
al salir. Las traducciones conservan la fecha y duración correctas.

## Educaci?n

`formacion_academica.html` presenta formaci?n en desarrollo de software sin
atribuir un grado universitario distinto ni especificar la denominaci?n formal
del programa. El propietario confirm? que el t?tulo fue obtenido en abril de 2025.

Incluye los 17 cursos de Platzi proporcionados por el propietario, con fechas
exactas y enlaces originales a los diplomas. Se agrupan en seguridad y riesgos,
programaci?n, desarrollo web/backend y herramientas de colaboraci?n/productividad.
Los cursos de seguridad aparecen primero. Se describen como cursos aprobados,
sin atribuir una certificaci?n ISO 27001 independiente al perfil.

Los textos y fechas tienen traducci?n ingl?s/espa?ol. Los registros se incluyen
en el HTML inicial, sin depender de JavaScript ni descargar im?genes de diplomas.
El t?tulo Platzi conserva el enlace al perfil. Los bloques de aplicaci?n remiten
a los logros documentados en Experiencia.

## Cach? de recursos en producci?n

`index.php` a?ade `?v=<SHA-256 abreviado>` a las hojas CSS y scripts locales del
cascar?n. El valor depende del contenido, no de la fecha del archivo, por lo que
funciona tambi?n al subir archivos preservando sus timestamps. La biblioteca
Chart.js cargada bajo demanda lleva su propio hash en la configuraci?n inicial.
Las variables CSS actuales se cargan al final para prevalecer sobre imports
anidados antiguos que puedan estar en cach?. El HTML solicita revalidaci?n.

Esto corrige el caso observado en producci?n: la URL sin versi?n de
`Scripts/script.js` entregaba el router del sitio antiguo, que fallaba al buscar
`.next-button` e imped?a inicializar las gr?ficas de la versi?n nueva.

Para desplegar esta correcci?n deben actualizarse `index.php`, `index.html` y
`Scripts/experiencia_laboral.js` juntos. Si el hosting guarda HTML en cach?, purgar
esa cach? tras subirlos. No es necesario cambiar datos laborales ni diplomas.

Verificaci?n: `python Tests/check_asset_versions.py` y
`node Tests/asset_cache.browser.cjs` (Chrome de pruebas en el puerto 9239).
La prueba de navegador simula un router antiguo en la URL sin versi?n y comprueba
que el arranque usa las URLs nuevas. `QA_USE_LOCAL_DOCUMENT=1` permite probar los
recursos del dominio con el HTML/m?dulo corregidos interceptados solo en el navegador;
no modifica el hosting.


El total de las gráficas se limita a los cargos mostrados en el sitio; no se presenta como el total completo de la trayectoria profesional.
