# Estética: la plataforma EducaPlay

Los capítulos se arman con la estética de la web de EducaPlay (Corrientes Play), nivel secundario.
La aplica `ae/build-episode.jsx` sobre las cajas del motor:

```bash
npm run ae -- <CODE>          # desde motor/ → episodios/<CODE>/<CODE>.aep
```

## Colores (medidos sobre la web)

| Uso | Color | Control en `CONTROL` |
|---|---|---|
| Bandas | cian `#5DCBE1`, rojo `#EA3355`, amarillo `#F5C042`, verde `#54B835` | Banda cian / roja / amarilla / verde |
| Tarjeta oscura (listados "LO MÁS VISTO") | `#3B3B3E` | Oscuro |
| Tarjeta clara (botones "1° AÑO") | `#F0F0F0` | Gris |
| Tinta | `#201D2F` | Tinta |
| Menta (botón "Descargá la APP", subrayado, flecha ↓) | `#6CEACB` | Menta |

Tipografía: **Museo Sans Rounded**. El peso 1000 va en los números gigantes y el 900 en los
títulos.

## Piezas

- **Titulares y pasos:** tarjeta oscura con la franja de 4 colores arriba (se dibuja de izquierda a
  derecha), título blanco y subrayado menta con la flecha ↓. Los pasos llevan a la izquierda la
  baldosa **"2° PASO"**, compuesta como los botones "2° AÑO" de la web. Al entrar, un barrido corto
  de bandas diagonales cruza la tarjeta.
- **Recursos de refuerzo** (fotos y GIF que ilustran lo que la docente ya dijo): fila de la web, con
  miniatura redondeada, título y metadatos con ícono ("RECURSO 4 · Recreado con IA",
  "ANIMACIÓN 6").
- **Recursos didácticos** (videos documentales): baldosa gris grande con el medio, el pie y el
  crédito en una pastilla oscura.
- **Checklists:** baldosa gris. Cada ítem lleva un pictograma blanco sobre un disco de color de
  banda, en el orden cian, amarillo, verde y recién después rojo (un tilde sobre rojo se lee como
  error). Los prohibidos llevan aro y tachado rojos. En una secuencia, un hilo menta une los ítems.
- **Portada** (plató vacío antes de que aparezca la docente):
  1. barrido de bandas diagonales;
  2. el lockup "**Educa**play | Nivel Secundario";
  3. una baldosa gris con la serie y el título del capítulo.

  Todo sube a una banda superior cuando entran los primeros recursos.
- **Traslados de cámara:** barrido de bandas diagonales, como el encabezado de la web.
- **Subtítulos:** pastilla canónica del estándar (ver `SUBTITULOS.md`).

## Movimiento

Las tarjetas se deslizan desde el borde exterior del cuadro con `easeOutBack`: se pasan apenas y
vuelven. El sistema de Ambiente desaconseja el sobrepaso, por eso **`Rebote (%)`** lo regula y
**con 0 lo apaga**. Los ítems entran con un pop.

## Capa `CONTROL`

Además de los colores:

| Control | Qué hace |
|---|---|
| `Entrada (frames)` | Duración de la entrada |
| `Salida (frames)` | Duración de la salida |
| `Deslizamiento (px)` | Distancia desde la que entra la tarjeta |
| `Rebote (%)` | Sobrepaso de la entrada (0 = sin rebote) |
| `Sombra (%)` | Opacidad de la sombra de las tarjetas |
| `Subtítulos` | Prende o apaga todos los subtítulos |

Todo el capítulo lee estos valores por expresión: un cambio de marca se hace ahí, no capa por capa.
