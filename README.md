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
