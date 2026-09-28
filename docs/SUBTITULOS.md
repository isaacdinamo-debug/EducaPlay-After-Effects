> **Nota de este repo.** Copia del estándar de EducaPlay (`Secundaria /subtitulos/EDUCAPLAY_MOTION_GRAPHICS_ACTUALIZADO.md`).
> Lo que rige acá es **§1.4 (subtitulado)**, aplicado en After Effects por `ae/build-episode.jsx` y verificado
> por `motor/scripts/check-layout.mjs`. Las secciones que hablan de componentes, comandos o render de Remotion
> quedan como referencia histórica: ver `docs/MIGRACION.md`.
>
> Diferencias adoptadas, con su motivo:
> - **Color de la pastilla:** negro al 55 % en lugar de `#07202C` al 55 %, porque la tinta sobre el papel del
>   plató da 3,84:1 y no pasa el piso de 4,5.
> - **Evasión de la placa:** el subtítulo que se cruza con la placa de la docente va elevado **toda su duración**,
>   en lugar de subir con una transición de 0,25 s. La placa del máster se anima antes de su rango reservado, y un
>   texto no se mueve mientras se lee.
> - **Sin modo karaoke:** en los capítulos no se resalta la palabra activa.

# EducaPlay Motion Graphics — Estándar Técnico y Sistema Visual Unificado
> Documento oficial de exportación de la habilidad `/educaplay-motion-graphics` consolidado con todas las actualizaciones y mejoras de producción hasta la fecha.

---

## 1. Principios Fundamentales del Sistema

### 1.1. Categorización de Carga de Atención y Coreografía Dual (16:9)
La interacción entre el docente y los motion graphics se rige de forma estricta por el nivel de atención que demanda el contenido pedagógico. Antes de animar, cada recurso debe clasificarse en una de estas tres categorías operativas:

1. **Recursos con Baja Carga de Atención (Stickers, Emojis y Titulares Cortos)**:
   - **Contenido**: Emojis animados, stickers ilustrativos, palabras clave o titulares de 1 o 2 líneas breves.
   - **Comportamiento del Docente**: El docente **permanece en el centro** de la pantalla (`framing: 'center'`).
   - **Ubicación del Gráfico**: El recurso se ancla flotante a la **IZQUIERDA** del docente en pantalla (`anchorX: 'left'`, `category: 'small_left'`), exactamente a **200 px** del margen izquierdo (`left: '200px'`, `top: '260px'`), respetando su silueta sin invadir su gesticulación ni los márgenes de seguridad.

2. **Recursos con Media Carga de Atención (Textos Largos, Videos Cortos, Gráficos y Enumeraciones)**:
   - **Contenido**: Conceptos desarrollados, pastillas descriptivas, enumeraciones verticales/fichas (pasos, ejemplos), comparativas y videos secundarios breves.
   - **Comportamiento del Docente**: El docente **se mueve o es reencuadrado a la IZQUIERDA** (`framing: 'left'`) en la línea de tiempo.
   - **Ubicación del Gráfico**: Se ancla a la **DERECHA** (`anchorX: 'right'`, `category: 'medium_right'`), ubicándose de forma protagónica debajo del logo/marca de agua de la materia, con pastillas de mayor porte e imágenes/videos en tarjetas con `<RainbowEyebrow />`.

3. **Recursos con Alta Carga de Atención (Videos Extensos y Gráficos Complejos)**:
   - **Contenido**: Videos demostrativos largos, infografías de alta densidad conceptual, mapas o cuadros sinópticos completos explicados en voz en off.
   - **Comportamiento del Docente**: El docente **desaparece del cuadro** (`framing: 'none'`).
   - **Ubicación del Gráfico**: Ocupa el centro de la pantalla a **cuadro completo / full screen** hasta los márgenes de seguridad (`safeArea`), centrado matemáticamente (`top: '50%'`, `left: '50%'`, `transform: 'translate(-50%, -50%)'`, dimensiones calibradas 1480 × 832 px), con fondo propio o viñeta de plató, mientras la narración en off guía la lectura.

> [!CRITICAL]
> **Nunca escribas coordenadas `top`/`left` a mano de manera arbitraria.** Toda posición se resuelve matemáticamente a través de `<Slot>` y `resolveSlot()` respetando esta coreografía.

---

### 1.2. Protocolo Obligatorio de Pre-Edición: Tablero Interactivo de Sincronización (Fase 0)
> [!IMPORTANT]
> **ESTÁNDAR MANDATORIO PARA TODAS LAS MATERIAS Y EPISODIOS**:
> Antes de escribir una sola línea de código en Remotion (`data.ts`), es **estrictamente obligatorio** confeccionar el **Tablero Interactivo de Sincronización Pre-Edición** (`TABLA_SINCRONIZACION_PRE_EDICION_[CODIGO].html` y `.md`). Este protocolo aplica sin excepción como instancia formal de validación técnica y pedagógica entre el Editor de Video, el Docente y el Motion Designer.

#### 1.2.1. Entregables Obligatorios de Fase 0
Por cada episodio a producir, el equipo debe generar en la carpeta del capítulo:
1. `TABLA_SINCRONIZACION_PRE_EDICION_[CODIGO].html`: Interfaz web interactiva de control con selectores, enlaces de recursos y botón de lanzamiento.
2. `TABLA_SINCRONIZACION_PRE_EDICION_[CODIGO].md`: Respaldo documental markdown formateado para lectura y control en GitHub.
3. `TABLA_SINCRONIZACION_DATOS.json`: Matriz de datos crudos estructurada con marcas temporales, textos y metadatos.
4. `remotion_generator.py`: Generador automatizado del proyecto Remotion (`data.ts`, `captions.ts`, componentes y assets).
5. `local_bridge_server.py`: Micro-servidor HTTP local (puerto 3210) que conecta la página HTML con el CLI de Remotion con un solo clic.

#### 1.2.2. Requisitos Mandatorios del Tablero de Sincronización
1. **Cruce Temporal Exacto**: Mapear cada fila de la escaleta contra el audio real del primer corte (`PRIMER CORTE.mp4`), documentando el segundo exacto (`start_time - end_time`) y los números de frame reales a 25 fps (`start_frame - end_frame`).
2. **Transcripción Fiel, Diferencias de Diálogo (🔴 Resaltado Rojo) y Selector de Subtítulos de 3 Vías**:
   - Transcribir el discurso real pronunciado por el docente (vía Whisper a nivel palabra).
   - **Resaltar obligatoriamente en rojo vivo (`#DC2626`)** toda diferencia entre lo escrito en la escaleta y lo dicho en cámara.
   - Selector interactivo de fuente de subtítulos en cada fila del HTML:
     * **[ ● ] Guion Escaleta (Recomendado por defecto)**: Marcado por defecto, garantiza coherencia gramatical.
     * **[ ○ ] Real Grabado (1er Corte)**: Opción para adoptar la transcripción exacta del audio grabado.
     * **[ ○ ] ✍️ Corrección Manual Personalizada**: Despliega un `<textarea>` editable donde se redacta la versión definitiva.
3. **Columna Específica de Titulares de la Escaleta Original**: Registrar el texto literal de cada titular pautado en la escaleta, con su código de tiempo y frame exacto de entrada y salida, identificando el recurso gráfico asociado para evitar colisiones.
4. **Columna de Propuestas Exclusiva para Filas Vacías (con Casilla Marcable)**:
   - **Regla anti-saturación**: La columna de propuestas **SOLO puede contener sugerencias en las filas donde NO existan recursos ni titulares en la escaleta original** (vacíos visuales del guion). Si la fila ya cuenta con titular o recurso, la columna debe permanecer limpia (`—`).
   - Cada propuesta debe incluir una **casilla interactiva (`<input type="checkbox">`)** para activar o descartar el gráfico propuesto con un clic.
5. **Detección del Encuadre Real vs. Norma de 3 Niveles de Atención**: Registrar la posición real del profesor en el video (Centro, Izquierda, Fuera de cuadro) y contrastarla con la requerida según el nivel de atención (Baja, Media o Alta).
6. **Auditoría de Recursos, Alerta de Faltantes y Casilla de Enlace**:
   - Todo recurso solicitado ausente en disco se destaca con tarjeta roja `🚨 RECURSO FALTANTE EN CARPETA`.
   - Casilla interactiva para enlazar reemplazos locales mediante botón examinar.
   - Detección de archivos sin extensión (ej. `.mp4`) o GIF sin fondo transparente.
7. **Botón de Aprobación y Generación Automatizada en Remotion**: Botón flotante `🚀 Aceptar y Generar Proyecto Remotion` que compila el manifest aprobado y levanta Remotion Preview en `http://localhost:3000`.

---

### 1.3. Reglas de Identidad y Docentes
- **Los nombres de las personas NUNCA se toman de la escaleta**: Las escaletas se redactan en preproducción y el casting real cambia. El nombre se extrae de la **placa quemada en el máster MP4** (lower third) y se confirma con coordinación.
- **La placa de nombre es un rect reservado (`RESERVED`)**: Se declara en `data.ts` con su rango de frames (`from` / `to`, comúnmente F215 a F445 o F697 a F866 según el máster) para que ningún gráfico ni subtítulo la pise.

---

### 1.4. Reglas Estrictas de Contraste, Legibilidad y Subtitulado (WCAG AAA)
- **NUNCA texto blanco suelto sobre el fondo del plató**: Los platós son claros y dan un ratio menor a 3.5:1.
- **Todo texto va sobre `<Surface>` o tarjetas opacas**: Fondo blanco `#FFFFFF` con tinta oscura (`#07202C` / `#0C2B24`, ratio > 15:1).
- **Énfasis triple**: Resaltado amarillo (`#FFF6C4` o `#FFDE3B`) + tinta oscura + subrayado o filete de acento.

#### Pastilla de Subtítulo Esmerilada (Estándar Canónico Universal)
> [!CRITICAL]
> **PROHIBICIÓN ESTRICTA DE DEGRADADOS Y BRILLOS ESPECULARES**:
> La pastilla de subtítulos nunca debe tener gradientes lineales (`linear-gradient`), brillos metálicos, destellos diagonales ni biseles pronunciados. Debe ser un **scrim plano y uniforme** con transparencia calibrada y desenfoque esmerilado (*frosted glassmorphism*):

```tsx
// Tokens canónicos obligatorios para la pastilla de subtítulos
const captionPillStyles: React.CSSProperties = {
  backgroundColor: 'rgba(7, 32, 44, 0.55)', // Scrim plano uniforme al 55% de opacidad
  backdropFilter: 'blur(10px)',              // Difuminado de plató / video
  WebkitBackdropFilter: 'blur(10px)',
  borderRadius: '20px',                      // Esquinas redondeadas (18px a 20px)
  border: '1px solid rgba(255, 255, 255, 0.16)', // Borde fino sutil
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '14px 34px',
  boxSizing: 'border-box',
  pointerEvents: 'none',
};
```

- **Tipografía de Subtítulos**:
  * Fuente: `Museo Sans 700`.
  * Texto inactivo / general: `#FFFFFF` con sutil sombra `textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'` para legibilidad impecable sobre cualquier vestimenta o fondo.
  * Resaltado de palabra activa (modo Karaoke / Reels): `backgroundColor: '#FFDE3B'`, color de texto `#07202C`, `fontWeight: 800`, `textDecoration: 'underline'`, sin sombra.
- **Regla Inflexible de Máximo 2 Líneas**: Ningún bloque de subtitulado puede superar las **dos líneas** en pantalla. Textos largos deben dividirse en oraciones sintácticas equilibradas (`textWrap: 'balance'`).
- **Evasión Obligatoria de la Placa del Docente**: Durante los frames en que la placa lower-third está en pantalla, la caja de subtítulos **se eleva automáticamente** (`bottom: '230px'` con `transition: 'bottom 0.25s ease'`) para despejar la franja inferior izquierda. Al terminar la placa, desciende a su posición base (`bottom: '48px'`).
- **Contrato de Montaje en Remotion (`<Sequence>`)**: Todo bloque de `DATA.blocks` debe envolverse en `<Sequence from={block.from} durationInFrames={block.to - block.from}>` para aislar el tiempo local (0 a `durationInFrames`), asegurando que `spring`, opacidades y transiciones funcionen correctamente.

---

## 2. Sistema Estético Oficial EducaPlay

### 2.1. Ceja Cromática Cuatricolor Obligatoria (`<RainbowEyebrow />`)
**TODA tarjeta pedagógica, titular, recurso, concepto, protocolo, paso o checklist DEBE incluir en su borde superior la Ceja Cromática Oficial de EducaPlay**:
- **Estructura**: 4 segmentos horizontales de proporciones exactamente iguales (25% cada uno), ordenados de izquierda a derecha:
  1. `Rojo / Coral`: `#D43453` (25%)
  2. `Amarillo Cálido / Oro`: `#F0BA46` (25%)
  3. `Cian / Celeste`: `#60B6D3` (25%)
  4. `Verde Hoja / Materia`: `#5DAA46` (25%)
- **Dimensiones**: Altura fija de `6px` a `8px` (`eyebrowHeight: '6px'`).
- **Enmascaramiento**: La tarjeta contenedora declara `borderRadius: '24px'` y `overflow: 'hidden'`, logrando que el borde multicolor se adapte de forma nativa a la curvatura de las esquinas superiores.
- **Regla de oro**: NUNCA usar bordes superiores monocolores verdes, blancos o planos. El riel cuatricolor es el sello distintivo de la marca paraguas EducaPlay.

```tsx
export const RainbowEyebrow: React.FC<{ height?: string | number }> = ({ height = '6px' }) => {
  const colors = ['#D43453', '#F0BA46', '#60B6D3', '#5DAA46'];
  return (
    <div style={{ width: '100%', height, display: 'flex', flexDirection: 'row', flexShrink: 0 }}>
      {colors.map((c, i) => (
        <div key={i} style={{ flex: 1, height: '100%', backgroundColor: c }} />
      ))}
    </div>
  );
};
```

---

### 2.2. Jerarquía Tipográfica de Marca (Museo y Museo Sans)
El proyecto utiliza exclusivamente las fuentes corporativas embebidas en `src/styles/fonts.css` o `public/fonts/`:

1. **Kickers / Tags Superiores**:
   - Fuente: `Museo Sans 700` u `800`.
   - `textTransform: 'uppercase'`, `letterSpacing: '0.10em'` a `'0.14em'`, color `accentDeep`.
2. **Titulares Principales (`TitularCard`)**:
   - Fuente: `Museo 700` o `900` (Slab serif).
   - Color: Tinta oscura profunda (`THEME.ink`: `#0C2B24` o `#07202C`), tamaño 34–38 px.
   - Filete de acento inferior: `84px × 4px`, `borderRadius: 2px`, `backgroundColor: THEME.accent`.
3. **Cuerpo y Explicaciones**:
   - Fuente: `Museo Sans` (400, 600 o 700). Piso mínimo de legibilidad: $\ge 26\text{ px}$.
4. **Tarjetas de Pasos Modulares (`StepHeaderCard` y `StepBodyCard`)**:
   - Cabecera con número gigante (56 px en `Museo 900`).
   - Cuerpo con ceja cuatricolor, íconos vectoriales delineados y palabras clave en negrita.
5. **Pastillas de Alerta Flotantes (`AlertPill`)**:
   - Cápsula blanca redondeada (`borderRadius: '20px'`), sombra profunda, ícono badge (`🚨`, `⚠️`, `❓`) y texto en `Museo 900` (30 px).

---

### 2.3. Tarjetas de Recursos Didácticos Estándar (`<MediaCard />`)
- **Ceja cuatricolor superior obligatoria** (`<RainbowEyebrow />`).
- **Well de media calibrado**: Fondo `#07202C` para fotos/videos reales o `#F4FBFD` para elementos gráficos transparentes.
- **Badge de fuente / atribución**: Esquina superior derecha con fondo oscuro translúcido (`rgba(7, 32, 44, 0.90)`), borde sutil y texto en `Museo Sans 700` (15 px).
- **Pie tipográfico institucional**: Superficie blanca `#FFFFFF`, Título en `Museo 900` (32–36 px) y bajada en `Museo Sans 600` (24–26 px).
- **Dimensiones según categoría (16:9)**:
  * `small_left`: 480 × 280 px (a 200 px del margen izquierdo).
  * `medium_right`: 680 × 380 px (docente a la izquierda o centro).
  * `large_center`: 1480 × 832 px (pantalla completa / docente fuera de cuadro, centrado horizontal y vertical).

---

## 3. Extensión Vertical: Reels y Redes Sociales (9:16)

Para adelantos temáticos, síntesis y difusión en Instagram Reels, TikTok y YouTube Shorts, se implementa la arquitectura modular de `/educaplay-redes`:

### 3.1. Contrato de Layout y Zonas Seguras (1080 × 1920 px)
Lienzo: **1080 × 1920 px**, 25 o 30 fps (medido previamente con `ffprobe`), Rec.709, AAC stereo.

| Región | Coordenadas / Medidas | Restricciones de UI |
|---|---|---|
| **Margen superior seguro** | $y < 280$ px | Libre de texto para evitar header de app y avatar. |
| **Margen inferior seguro** | $y > 1650$ px | Libre de contenido (descripción, audio y progreso). |
| **Margen lateral derecho** | $x > 940$ px | Botones de interacción (Likes, comentarios, compartir). |
| **Contenedor gráfico (`card`)** | $x: 80$–$900$, $y: 360$–$1040$ px ($h: 680$ px) | Tarjeta con `<RainbowEyebrow />` para contenidos visuales. |
| **Cápsula de subtítulos** | $x: 80$–$900$, $y: 1100$–$1240$ px ($h: 140$ px) | Scrim plano translúcido con karaoke palabra a palabra. |
| **Separación de seguridad** | $\Delta y = 60$ px ($1040$ a $1100$ px) | Separación estricta que previene colisiones. |

### 3.2. Cierre y Transición al Outro Institucional
- Declarar `REEL_META.contentFrames` (ej. frame 936 o frame 1188 según máster).
- Al alcanzarse `frame >= REEL_META.contentFrames`, tanto las tarjetas de escena (`SocialScenes`) como la pastilla de subtítulos (`SocialCaptions`) **se ocultan automáticamente**, permitiendo que el outro institucional (pantalla morada con logo de Corrientes Play) se reproduzca limpio y sin superposiciones.

---

## 4. Entorno de Desarrollo y Estabilidad en Windows

> [!WARNING]
> **PROHIBICIÓN DE NTFS JUNCTIONS / SYMLINKS EN `public/` BAJO WINDOWS**:
> En sistemas Windows, la creación de enlaces simbólicos o junctions NTFS (`mklink /J`) dentro de `remotion/public` genera errores severos de permisos `EPERM: operation not permitted` durante el empaquetado Webpack de Remotion y Puppeteer.
>
> **Procedimiento obligatorio**:
> 1. Utilizar un script de sincronización física en Python o Node (ej. `setup_public.py`).
> 2. Copiar físicamente los directorios necesarios (`audio`, `fonts`, `RECURSOS`) y el video máster de `RENDER` usando `shutil.copytree` / `shutil.copy2`.
> 3. Nunca depender de junctions en `public/`.

---

## 5. Control de Calidad y Verificación Automatizada (QA Probes)

Todo proyecto debe incluir un script de validación headless (`check-layout.mjs` para 16:9 o `check-reel.mjs` para 9:16) que certifique antes de renderizar:
1. **Existencia física de todos los assets**: Máster MP4 en `public/RENDER`, imágenes/GIFs en `public/RECURSOS` y audios en `public/audio`.
2. **Sincronización de subtítulos**: Duración positiva en todas las palabras (`to > from`) y **exactamente 1 palabra activa simultánea** en karaoke.
3. **Validación estética estricta de la pastilla**: Comprobación automatizada de código para asegurar que `SocialCaptions.tsx` **no contenga `linear-gradient`**.
4. **Respeto a zonas seguras**: Gráficos y subtítulos confinados estrictamente a sus coordenadas sin desbordes.

Comando de verificación:
```bash
npm run check
# o para reels:
npm run check:reel
```

---

## 6. Comandos de Render y Exportación de Entregables

### 6.1. Episodio Horizontal Completo (16:9)
```bash
# Render con video máster integrado
npx remotion render Episode<CODE> out/<CODE>-FINAL.mp4 --concurrency=8

# Render de Overlays con Canal Alfa (ProRes 4444 para Premiere Pro)
npx remotion render Episode<CODE>-Overlay out/<CODE>-OVERLAYS-ALPHA.mov --codec=prores --prores-profile=4444 --pixel-format=yuva444p10le
```

### 6.2. Reel Vertical Social (9:16)
```bash
# Render del Reel completo para redes
npx remotion render Reel<CODE> out/<CODE>-REEL-FINAL.mp4

# Render del Reel en Canal Alfa
npx remotion render Reel<CODE>-Overlay out/<CODE>-REEL-ALPHA.mov --codec=prores --prores-profile=4444 --pixel-format=yuva444p10le
```

---

## 7. Checklist Definitivo Pre-Entrega

- [ ] **Tablero Fase 0 aprobado**: Matriz de sincronización validada por docente y editor.
- [ ] **Assets físicos en Windows**: Copiados físicamente en `public/` sin junctions ni symlinks.
- [ ] **Ceja cuatricolor obligatoria**: Presente en todas las tarjetas pedagógicas (`#D43453`, `#F0BA46`, `#60B6D3`, `#5DAA46`).
- [ ] **Pastilla de subtítulos canónica**: Fondo plano translúcido `rgba(7, 32, 44, 0.55)` con blur de 10 px, **cero degradados**, borde sutil `rgba(255, 255, 255, 0.16)` y máximo 2 líneas.
- [ ] **Evasión de lower-third**: Subtítulos elevados a `bottom: 230px` mientras la placa docente está visible.
- [ ] **Outro limpio**: Gráficos y subtítulos apagados durante el cierre institucional (`contentFrames`).
- [ ] **QA con 0 errores**: Ejecución de `npm run check` o `npm run check:reel` exitosa.
- [ ] **Archivos finales en `RENDER/`**: Video MP4 y/o MOV ProRes 4444 verificados con `ffprobe`.
