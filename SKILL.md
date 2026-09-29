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

## Protocolo Obligatorio de Pre-Edición: Matriz de Sincronización (Fase 0)

Antes de escribir `data.ts` o exportar a After Effects, es **estrictamente obligatorio** confeccionar y validar el **Tablero Interactivo de Sincronización Pre-Edición** (`TABLA_SINCRONIZACION_PRE_EDICION_[CODIGO].html` y `.md`, respaldado por `TABLA_SINCRONIZACION_DATOS.json`):

1. **Cotejo Riguroso Whisper vs. Escaleta (🔴 Resaltado Rojo `#DC2626`)**:
   - Mapeo palabra por palabra del audio real grabado contra el texto del guion en la escaleta.
   - Toda discrepancia, omisión o agregado en el discurso pronunciado en cámara debe resaltarse visiblemente en rojo vivo.
2. **Selector de Subtítulos de 3 Vías**:
   - `[ ● ] Guion Escaleta`: Garantiza redacción formal y gramática académica (por defecto).
   - `[ ○ ] Real Grabado (Whisper)`: Adopta la transcripción fonética literal de lo dicho en cámara.
   - `[ ○ ] ✍️ Corrección Manual`: Despliega un `<textarea>` editable para ajustes editoriales finos.
3. **Fidelidad Absoluta a la Escaleta (Regla Anti-Invenciones)**:
   - **Columna TITULARES**: Debe conservar única y exclusivamente los textos literales pautados en la columna *TITULARES* de la escaleta original. NUNCA inventar titulares donde la escaleta no los solicita.
   - **Columna RECURSOS GRÁFICOS**: Debe reflejar con precisión los recursos indicados en la escaleta, vinculados a la auditoría física en la carpeta `RECURSOS/` (OK / Faltante / Relink).
4. **Configuración de Entradas, Salidas y Posición de Motion Graphics y Recursos**:
   - Cada recurso y elemento gráfico debe contar con controles interactivos editables:
     * **Entrada (Frame / Segundo)**: Cuadro de inicio de la animación / entrada.
     * **Salida (Frame / Segundo)**: Cuadro de salida / desvanecimiento.
     * **Posición / Slot**: Selector de anclaje (`Banda Derecha` para docente a la izquierda, `Flotante Izquierda` para docente al centro, `Pantalla Completa` para docente fuera de cuadro, o `Zócalo Inferior`).
   - Los valores configurados se persisten directamente en `TABLA_SINCRONIZACION_DATOS.json` y configuran los parámetros de `resolveSlot` y `data.ts`.


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
- tarjetas de recursos visuales a tamaño completo y prominente (`mediaCard`), sin recortes innecesarios;
- checklists en baldosa gris con discos de color;
- barridos de bandas diagonales en los traslados.

> [!CRITICAL]
> **Reglas Estructurales Obligatorias para Motion Graphics en After Effects:**
> 1. **NUNCA agregar titular sobre el profesor ni portada de apertura (`APERTURA · portada`)**: El máster comienza limpio con la presentación de la docente en cuadro, sin portadas invasivas de "EducaPlay | Nivel Secundario" tapando la cámara.
> 2. **NUNCA agregar la leyenda 'RECURSO' o 'ANIMACIÓN' sobre las pastillas**: Esa clasificación pertenece únicamente a la matriz/tabla pre-edición para comprensión editorial. En el video final no deben figurar etiquetas técnicas ni meta-íconos redundantes.
> 3. **Maximización y prominencia del recurso**: Los recursos visuales (fotos, videos, GIFs/animaciones) deben aprovechar al máximo el área útil de la pastilla (`mw = w - 28px`), evitando el patrón de miniaturas de 150 px. El protagonista gráfico es el recurso en sí.

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

## Flujo por capítulo

0. **Fase 0: Tablero Interactivo de Sincronización Pre-Edición** (`TABLA_SINCRONIZACION_PRE_EDICION_[CODIGO].html` y `.md`, y `TABLA_SINCRONIZACION_DATOS.json`):
   - Cruce exacto Whisper vs Escaleta a 25 fps con diferencias resaltadas en rojo 🔴 `#DC2626`.
   - Selector interactivo de subtítulos de 3 vías (Guion escaleta / Real grabado Whisper / Corrección manual).
   - Columna **TITULARES**: estricta reproducción de la escaleta original, sin inventar nada.
   - Columna **RECURSOS**: auditoría rigurosa de los recursos pautados en la escaleta y su presencia en `RECURSOS/`.
   - **Configuración de Entradas, Salidas y Posición de Motion Graphics y Recursos**:
     * Parámetros editables de In Frame, Out Frame y Posición de Slot (`Banda Derecha`, `Flotante Izquierda`, `Pantalla Completa`, `Zócalo Inferior`).
     * Persistencia en `TABLA_SINCRONIZACION_DATOS.json` para alimentar `data.ts`.
1. `npm run track -- <CODE>`: encuadre y traslados de la docente.
2. `npm run whisper -- <CODE>` y `npm run captions -- <CODE>`: transcribir con timing por palabra y generar los subtítulos oficiales.
3. `npm run cues -- <CODE>`: resolver palabras-gatillo a frames.
4. Escribir `motor/src/episodes/<CODE>/data.ts` (basado en la matriz aprobada de Fase 0) y validar con `npm run check -- <CODE>`.
5. `npm run export:ae -- <CODE>`: vuelca el manifiesto a `episodios/<CODE>/manifest.json`.
6. En After Effects: correr el armado (`ae/build-<CODE>.jsx`), verificar con stills y `contacto.jpg`.
7. `npm run publicar -- <CODE>`: commitear, pushear y abrir el PR.

## Verificación

- `npm run check -- <CODE>`: tipos, layout (docente, rects, 2 líneas con la fuente real) y
  contraste.
- `npm run ae -- <CODE>`: falla ante cualquier ⚠ o ✗ del LOG, si faltan tarjetas,
  subtítulos o stills, o si no se guardó el `.aep`.
- **Mirar las hojas de contacto** de `episodios/<CODE>/revision/`. Los scripts no ven un texto
  cortado ni un gráfico feo.
- `npm run publicar -- <CODE>` repite todo y sólo entonces commitea, pushea y abre el PR.

## Guía de Ejecución de 0 en Otra PC (Turnkey Setup)

Para replicar este entorno de trabajo y ejecutar el pipeline completo en cualquier otra computadora (Windows o macOS):

### 1. Clonar el repositorio
```bash
git clone https://github.com/isaacdinamo-debug/EducaPlay-After-Effects.git
cd EducaPlay-After-Effects
```

### 2. Prerrequisitos de Software
- **Node.js ≥ 22.6** (con soporte para `--experimental-strip-types`)
- **Python ≥ 3.10** (para el servidor bridge y automatización de tablas)
- **Adobe After Effects** (versiones 2024, 2025 o 2026).
  * *Configuración obligatoria en After Effects*: Menú **Editar > Preferencias > Scripting y expresiones** (o *After Effects > Configuración > Scripting* en Mac) → Tildar **"Permitir que los scripts escriban archivos y tengan acceso a la red"**.
- **FFmpeg / FFprobe** en el PATH del sistema.
- **Tipografías oficiales instaladas**:
  * *Museo* (700 / Bold)
  * *Museo Sans Rounded* (700 / Bold, 900 / Black)

### 3. Instalación de Dependencias
```bash
cd motor
npm install
cd ..
```

### 4. Estructura de Trabajo de un Nuevo Capítulo
Crear o ubicar la carpeta del capítulo con los 3 insumos obligatorios del montajista:
```text
[CARPETA_CAPITULO]/
  ├── RENDER/
  │    └── [CODIGO]-PRIMERCORTE.mp4     # Máster en video (1080p, 25 fps)
  ├── [CODIGO] ESCALETA.docx            # Guion con columnas Escena / Titulares / Locución / Recursos
  └── RECURSOS/                         # Carpeta con imágenes, videos B-roll, audios y animaciones
```

### 5. Ejecución del Pipeline Paso a Paso
1. **Medición del máster y encuadre docente**:
   ```bash
   cd motor
   npm run track -- <CODE> --master "ruta/al/video.mp4"
   ```
2. **Transcripción fonética y alineación**:
   ```bash
   npm run transcribe -- <CODE>
   ```
3. **Generación del Tablero Interactivo de Sincronización Pre-Edición (Fase 0)**:
   - Se abre `TABLA_SINCRONIZACION_PRE_EDICION_<CODE>.html` en el navegador.
   - En la terminal se corre el servidor puente:
     ```bash
     python tools/local_bridge_server.py <CODE> --dir "ruta/al/episodio"
     ```
   - En el tablero: revisar cotejo Whisper vs Escaleta (diferencias en rojo 🔴), seleccionar subtítulos (Escaleta / Grabado / Manual), auditar recursos y ajustar entradas/salidas/posiciones.
4. **Validación y Exportación del Manifiesto**:
   ```bash
   cd motor
   npm run check -- <CODE>
   npm run export:ae -- <CODE>
   ```
5. **Generación del Proyecto After Effects (.aep)**:
   - Presionar el botón `🚀 Aceptar y Generar Proyecto After Effects` en el Tablero web, O ejecutar:
     ```bash
     python tools/build_ae_project.py <CODE> --dir "ruta/al/episodio"
     ```
   - O bien desde After Effects: **Archivo > Scripts > Ejecutar archivo de script...** seleccionando `ae/build-<CODE>.jsx`.
6. **Revisión Final**:
   - Inspeccionar `episodios/<CODE>/revision/contacto.jpg` para certificar los stills, tipografía y encuadres limpios.

