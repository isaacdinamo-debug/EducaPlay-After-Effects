---
name: educaplay-after-effects
description: |
  Capítulos de EducaPlay Secundaria (Corrientes) en Adobe After Effects: medir el máster con el motor (encuadre de la docente, Whisper, palabras-gatillo), escribir el data.ts del episodio, exportar el manifiesto, armar el .aep editable con la estética de la plataforma EducaPlay, verificar con stills y publicar en GitHub. Usar para cualquier código de episodio (AMB26-XX, LEO0XX…), para tocar ae/build-episode.jsx, o para diagnosticar por qué un gráfico pisa a la docente, un subtítulo pasa de dos líneas o el armado en AE deja advertencias.
---

# EducaPlay en After Effects

Los scripts hacen la medición y el armado. Este archivo guarda **los criterios y las trampas**: lo
que no se deduce leyendo el código y lo que más caro salió descubrir. El paso a paso operativo es el
workflow `/episodio-ae`.

## La regla que ordena todo

El montajista mueve la cámara para hacerle lugar al gráfico. El motor no inventa esa coreografía:
**la lee**. `track-presenter.mjs` mide dónde está parada la docente y `resolveSlot`
(`motor/src/layout/presenter.ts`) ubica cada tarjeta en la banda que quedó libre. `export-ae.mjs`
vuelca esas cajas al manifiesto y el `.jsx` sólo pone en escena.

- **Nunca escribas coordenadas a mano**, ni en `data.ts` ni en el `.jsx`. Si parece que hace falta,
  al slot le falta un parámetro.
- **La posición de la docente decide quién es protagonista.** Centrada: ella, con tarjetas de
  560 px. Corrida a un costado: el motion graphics, con tarjetas de hasta 900 px. La regla vive una
  sola vez, en `STAGE_MAX_W` de `motor/src/episodes/blocks.ts`.
- **Las tarjetas se anclan al borde EXTERIOR del cuadro.** La banda cambia con cada gesto; el borde
  no.
- **Dos bloques simultáneos declaran slots disjuntos** (`align: 'top'` con `maxHeight`, contra
  `align: 'bottom'`).

## Contenido del `data.ts`

- **Cada recurso declara su rango:** `'didactico'` (hay que leerlo, o es evidencia real) o
  `'refuerzo'` (ilustra lo que la docente ya dijo). Es una decisión editorial.
- **Un recurso ilegible es peor que no ponerlo.** Si la imagen del cliente trae texto adentro, se
  recompone como `kind: 'checklist'`.
- **Pisos que hace cumplir `check-layout`:**
  - 60 frames por bloque;
  - 50 frames por ítem de una tira;
  - 380 px de ancho mínimo;
  - 26 px de cuerpo.
- **La cabecera del `data.ts` es parte del entregable.** Tiene que decir:
  - la coreografía del máster;
  - lo que la escaleta pide y el máster no da;
  - los errores de ASR con su frame;
  - los rects quemados;
  - cada excepción con su motivo.

**Las cuatro comprobaciones que ningún script hace:**
1. Un score de 1.00 en un gatillo sólo dice que la palabra existe, no que sea el cue correcto.
2. Buscá cada palabra-gatillo en `words.json`, una por una, para detectar lo que nunca se grabó.
3. El nombre de la docente sale de la placa quemada y se confirma con Isaac, nunca de la escaleta.
4. Leé los subtítulos generados. Whisper cambia palabras por otras que existen; se corrigen con
   `CAPTION_FIX`.

## Estética: la plataforma EducaPlay (`docs/ESTETICA.md`)

Es la única. Toma los colores medidos sobre la web de Corrientes Play:

| Uso | Color |
|---|---|
| Bandas | cian `#5DCBE1`, rojo `#EA3355`, amarillo `#F5C042`, verde `#54B835` |
| Tarjeta oscura | `#3B3B3E` |
| Gris | `#F0F0F0` |
| Tinta | `#201D2F` |
| Menta | `#6CEACB` |

Y sus piezas:
- titulares en tarjeta oscura con franja de 4 colores y subrayado menta con flecha ↓;
- baldosa "2° PASO";
- recursos de refuerzo como filas con miniatura;
- checklists en baldosa gris con discos de color;
- portada "Educaplay | Nivel Secundario";
- barridos de bandas diagonales en los traslados.

**Movimiento:** `easeOutBack` regulado por `Rebote (%)`; con 0 no hay sobrepaso, que el sistema de
Ambiente desaconseja.

La capa `CONTROL` de la comp principal gobierna todo el capítulo:
- colores: Gris, Oscuro, Tinta, Menta y Banda cian/roja/amarilla/verde;
- `Entrada`, `Salida`, `Deslizamiento`, `Rebote` y `Sombra`;
- `Subtítulos` on/off.

Las precomps la leen por expresión. Un cambio de marca se hace ahí, no capa por capa.

## Subtítulos (`docs/SUBTITULOS.md` §1.4)

- **Sin resaltado por palabra.** Una capa de texto por subtítulo: se edita con doble clic y el
  timing se ajusta con los bordes de la capa.
- **Pastilla canónica:**
  - scrim plano negro al 55 %, con 10 px de desenfoque detrás;
  - radio 20, borde blanco al 16 %, filete interior y sombra.
  - Es negro y no la tinta del documento, porque la tinta da 3,84:1 y el piso es 4,5:1.
- **Tipografía:** Museo Sans Rounded 700 blanca con sombra, interlineado 1,32.
- **Máximo dos líneas:** el export pagina con `paginateCaptions`, igual que `check-layout`, y AE
  corta de forma balanceada.
- **Placa de nombre:** si un subtítulo se cruza con la placa de la docente, va **elevado toda su
  duración**. La placa del máster se anima unos 25 frames antes de su `RESERVED`, y un texto no se
  mueve mientras se lee.

## Trampas de After Effects (cada una costó una iteración)

1. **`addProperty` invalida las referencias anteriores del mismo grupo.** Agregá todo y después
   pedí cada propiedad de nuevo por matchName.
2. **Un grupo de shape nuevo queda DEBAJO de los anteriores.** Para ponerlo al frente,
   `grp.moveTo(1)` y volvé a pedir la referencia (`toFront()`).
3. **Ubicá el null (ancla y posición) ANTES de emparentarle hijos.** Si lo movés después, los
   arrastra fuera de cuadro.
4. **`ADBE Text Render Order` = 2** es «rellenos sobre trazos». Con 3, el trazo tapa la letra.
5. **Cuántos `KeyframeEase` pide cada propiedad no se deduce del tipo.** Scale de una capa 2D es
   ThreeD pero pide 2; lo espacial pide 1. `keys()` prueba 1, 2 y 3.
6. **`saveFrameToPng` es asíncrono.** Vuelve antes de escribir: hay que esperar a que exista el
   archivo, y no cerrar el proyecto enseguida.
7. **Manejo desde la terminal:**
   - `DoScript` siempre devuelve "0": lo que haya que leer de vuelta se escribe a un archivo
     temporal;
   - con `DoScriptFile`, esas escrituras quedan en 0 bytes: se usa `DoScript "$.evalFile(…)"`;
   - ExtendScript en Mac escribe `\r` salvo `lineFeed = 'Unix'`.
8. **Una capa de ajuste dentro de una precomp alcanza al máster** sólo si la capa de la precomp va
   con «contraer transformaciones». Así se hace el esmerilado de los subtítulos.
9. **AE importa un GIF como cuadro fijo.** El export los transcodifica a `.mov` (Animation, con
   alfa) y el `.jsx` los loopea.
10. **Nombres visibles cambian con el idioma de AE.** Siempre matchNames, y efectos por índice en
    las expresiones.

## Verificación

- `npm run check -- <CODE>`: tipos, layout (docente, rects, 2 líneas con la fuente real) y
  contraste.
- `npm run ae -- <CODE>`: falla ante cualquier ⚠ o ✗ del LOG, si faltan tarjetas,
  subtítulos o stills, o si no se guardó el `.aep`.
- **Mirar las hojas de contacto** de `episodios/<CODE>/revision/`. Los scripts no ven un texto
  cortado ni un gráfico feo.
- `npm run publicar -- <CODE>` repite todo y sólo entonces commitea, pushea y abre el PR.
