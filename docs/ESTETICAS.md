# Estéticas del armado en After Effects

Las tres se generan con el mismo constructor (`ae/build-episode.jsx`) y comparten las cajas del
motor, los tiempos y los subtítulos. Se elige una por corrida:

```bash
npm run ae -- <CODE> --estilo organico|vidrio|plataforma     # desde motor/
```

Cada una guarda `episodios/<CODE>/<CODE>-<estilo>.aep`.

## Lo común

- **Estructura del proyecto:**
  - `00_CONTROL`, `01_MASTER`, `02_GRAFICOS` (una precomp por bloque, `<kind>_<key>`),
    `03_ASSETS` y `04_SUBTITULOS`;
  - la comp principal se llama como el episodio.
- **Capa `CONTROL`:** colores de marca, `Entrada (frames)`, `Salida (frames)`, `Sombra (%)` y
  `Subtítulos` on/off. Las precomps la leen por expresión.
- **Guía de zonas reservadas:** una capa guía, que no se renderiza, con los rects quemados en el
  máster (marca de agua, papel rasgado, placa de nombre).
- **Subtítulos:** una capa por subtítulo sobre la pastilla canónica (ver `SUBTITULOS.md`).

## Orgánico

La primera versión: cálida y "de materia".

- **Tarjetas:** de papel, con grano de Fractal Noise, filete y hojas que brotan en la esquina de las
  didácticas. La barra arcoíris se dibuja en tramos.
- **Movimiento:** capas 3D con cámara; entran desde atrás girando sobre su borde exterior, con
  motion blur. Una cámara con deriva suave les da parallax.
- **Pasos:** numeral en disco, con pop, y una ola corta que barre la tarjeta al entrar.
- **Íconos:** pictogramas blancos en disco verde oscuro. Los prohibidos llevan aro y tachado.
- **Apertura:** el título del capítulo entra grande sobre el plató vacío y sube a una banda.
- **Traslados de cámara:** cortina de agua en tres tonos.
- **Controles propios:** `Profundidad entrada (px)` y `Parallax (px)`.

## Vidrio (editorial premium)

- **Paneles de vidrio:** el plató se ve desenfocado detrás de cada panel. Tinte de papel
  translúcido, filete de luz y brillo superior.
- **Paleta:** la de la marca, con menos saturación.
- **Tipografía:** numerales grandes y livianos ("01"). Un arcoíris de 4 trazos como única nota de
  color junto al kicker. Filete verde que se dibuja.
- **Movimiento:** easing exponencial, con fundido y subida corta; sin 3D ni rebotes. Los títulos
  entran línea por línea.
- **Íconos:** de trazo fino en aro.
- **Sin placa de apertura.** Los traslados se disimulan con un desenfoque que va y vuelve.
- **Controles propios:** `Desenfoque vidrio`, `Opacidad vidrio (%)` y `Subida entrada (px)`.

## Plataforma (como la web de EducaPlay)

Colores medidos sobre la web de Corrientes Play:

| Uso | Color |
|---|---|
| Bandas | cian `#5DCBE1`, rojo `#EA3355`, amarillo `#F5C042`, verde `#54B835` |
| Tarjeta oscura | `#3B3B3E` |
| Gris | `#F0F0F0` |
| Tinta | `#201D2F` |
| Menta | `#6CEACB` |

- **Titulares y pasos:** tarjeta oscura con la franja de 4 colores arriba, título blanco y
  subrayado menta con flecha ↓. Los pasos llevan la baldosa **"2° PASO"**, compuesta como los
  botones "2° AÑO" de la web.
- **Recursos de refuerzo:** fila con miniatura redondeada, título y metadatos con ícono
  ("RECURSO 4 · Recreado con IA").
- **Checklists y recursos didácticos:** baldosa gris plana. Los íconos van en discos de color de
  banda (cian, amarillo, verde y recién después rojo: un tilde sobre rojo se lee como error).
- **Portada:** bandas diagonales, el lockup "**Educa**play | Nivel Secundario" y una baldosa con el
  título.
- **Traslados:** barrido de bandas diagonales.
- **Movimiento:** las tarjetas se deslizan desde el borde con `easeOutBack`. El sistema de Ambiente
  desaconseja el sobrepaso, por eso `Rebote (%)` lo regula y con 0 lo apaga.
- **Controles propios:** `Deslizamiento (px)` y `Rebote (%)`. Los colores de `CONTROL` se llaman
  como en la web: Gris, Oscuro, Menta y Banda cian/roja/amarilla/verde.
