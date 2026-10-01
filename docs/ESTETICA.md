# Estética: la plataforma Educaplay

Los capítulos se arman con la estética de la web de Educaplay (Corrientes Play), nivel secundario. Es la
misma para todas las materias; lo que cambia por materia es la serie y el plató (`motor/src/brand/estudios.ts`).
La marca se escribe siempre «Educaplay».
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
  miniatura redondeada, título y, si tiene, el crédito con su ícono ("Recreado con IA"). **Nunca**
  la numeración de la escaleta ("RECURSO 10", "ANIMACIÓN 7"): es interna y al estudiante no le dice
  nada.

  **Variante en prueba, «recursos grandes»** (`npm run ae -- <CODE> --recursos grandes`): la misma
  fila, pero la imagen ocupa ~60 % del ancho de la tarjeta (50 % con la docente al centro) y todo el
  alto que da la caja; el título crece a 36 px (28 en la caja angosta). Se compara con
  `npm run preview -- <CODE> --recursos grandes --comparar`. No pisa el armado por defecto: sale a
  `<CODE>-grandes.aep` y `revision-grandes/`.
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

## Modo vivo (el armado por defecto desde el 30/9/2026)

```bash
npm run ae -- <CODE>             # modo vivo → <CODE>.aep y revision/
npm run ae -- <CODE> --clasico   # sin modo vivo → <CODE>-clasico.aep y revision-clasico/
```

La misma estética y las mismas piezas, con más vida **dentro del Motion Design System §6**: nada
corre en loop ni se mueve de fondo, y el rebote se apaga. El movimiento responde a la docente.
Probado en AMB26-04; en un capítulo de mitos como AMB26-02 (titular y después recursos sueltos en la
misma caja) casi no hay transformaciones ni hilos, y queda igual de sobrio.

| Recurso | Qué hace | Por qué entra en el manual |
|---|---|---|
| **Transformación entre titulares** | Si el titular siguiente empieza a ≤ 20 cuadros, en la misma caja y sin traslado de cámara, la tarjeta no sale: se va el contenido (sube y se funde en 9 cuadros), la tarjeta acomoda su alto y entra el titular nuevo. Entre dos pasos la baldosa queda y cambia el número. | «Continuo y conectado» (§9.3); las salidas liberan espacio sin vaciar el cuadro (§6). |
| **Viaje en los traslados** | Si entre dos titulares hay un traslado de cámara que los cambia de lado, la tarjeta viaja hacia el lado nuevo con el barrido de bandas y el titular nuevo llega desde ese rumbo. Si no cambia de lado, la tarjeta espera bajo las bandas y se estira a la caja nueva. | Movimiento con intención: acompaña el recorrido de la cámara (§3.7). |
| **Asentamiento** | Al terminar de entrar, la tarjeta sigue unos px hacia adentro y se detiene. Reemplaza al rebote (`Rebote` = 0). | Aceleración y desaceleración naturales, sin rebote (§6). Pasa una sola vez. |
| **Título al ritmo de la voz** | Cada palabra del titular entra cuando la docente la dice (con `words.json`). Sólo si el calce es limpio: en orden, empezando en los primeros 20 cuadros y en menos de 60. Si no, revelado de siempre. | Información sincronizada con la explicación oral (§3.3). |
| **Flecha que avisa** | La flecha ↓ del subrayado cabecea una vez cuando entra el recurso de abajo y 24 cuadros antes de que el titular se vaya o se transforme. | Las entradas anticipan dónde mirar (§6). |
| **Hilo flecha → recurso** | Un trazo menta asoma debajo de la flecha ↓ del titular y baja hasta el recurso que lo ilustra cuando éste termina de entrar. | Movimiento que muestra relación (§3.7). |
| **Pastillas** | `chips` del titular en `data.ts`: lo que la docente enumera y no está en pantalla. Cada una entra sobre su palabra (cue) y la tarjeta crece para hacerle lugar. Es contenido: lo decide el responsable. | Aparición progresiva sincronizada con la voz (§3.3). |
| **Por partes** | En filas y tarjetas de medio: tarjeta → medio (fundido + máscara 92→100 %) → título → metadatos. | Aparición progresiva (§3.3). |
| **Foco en la secuencia** | En listas encadenadas (Antes → Durante → Después), al pasar al ítem siguiente los anteriores bajan al 45 %; al final vuelven todos. | Una idea visual principal por vez (§3.3). |

Controles que agrega a `CONTROL`:

| Control | Qué hace |
|---|---|
| `Asentamiento (px)` / `Asentamiento (frames)` | Distancia y duración del asentamiento (0 px lo apaga) |
| `Flecha que avisa` | Prende o apaga los cabeceos de la flecha |
| `Foco en la secuencia` | Prende o apaga el atenuado de los ítems anteriores |
