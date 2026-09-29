# EducaPlay After Effects

Capítulos de **EducaPlay Secundaria (Corrientes)** armados en Adobe After Effects a partir del máster grabado y su escaleta. El motor de medición ubica cada gráfico en la banda libre que deja la docente, y un constructor en ExtendScript arma un `.aep` editable con la estética oficial de la plataforma EducaPlay.

Repositorio oficial: [https://github.com/isaacdinamo-debug/EducaPlay-After-Effects.git](https://github.com/isaacdinamo-debug/EducaPlay-After-Effects.git)

---

## Requisitos del Sistema
- **Sistemas Operativos**: Windows 10/11 o macOS.
- **Adobe After Effects**: versiones 2024, 2025 o 2026.
  * *Habilitación indispensable*: En Preferencias > **Scripting y expresiones** → activar **"Permitir que los scripts escriban archivos y tengan acceso a la red"**.
- **Node.js**: versión ≥ 22.6.
- **Python**: versión ≥ 3.10.
- **FFmpeg / FFprobe**: en el PATH del sistema.
- **Tipografías Oficiales**: *Museo* (700 Bold) y *Museo Sans Rounded* (700 Bold, 900 Black).

---

## Instalación desde 0 en cualquier PC

```bash
# 1. Clonar el repositorio
git clone https://github.com/isaacdinamo-debug/EducaPlay-After-Effects.git
cd EducaPlay-After-Effects

# 2. Instalar dependencias del motor
cd motor
npm install
cd ..
```

---

## Flujo Operativo por Capítulo

### 0. Estructura de insumos del episodio
Cada entrega del montajista debe ubicarse en su carpeta correspondiente con:
- `RENDER/[CODIGO]-PRIMERCORTE.mp4` (Máster grabado a 1080p, 25 fps).
- `[CODIGO] ESCALETA.docx` (Guion pautado con columnas de escena, titulares, locución y recursos).
- `RECURSOS/` (Imágenes, videos B-roll, audios y animaciones).

### 1. Medición y Transcripción
```bash
cd motor
npm run track -- <CODE> --master "ruta/al/video.mp4"
npm run transcribe -- <CODE>
```

### 2. Tablero de Sincronización Pre-Edición (Fase 0)
- Abrir `TABLA_SINCRONIZACION_PRE_EDICION_<CODE>.html` en el navegador.
- Iniciar el servidor local Bridge para comunicación bidireccional:
```bash
python tools/local_bridge_server.py <CODE> --dir "ruta/al/episodio"
```
- **Revisión en el tablero**:
  * Cotejo palabra por palabra de Whisper vs. Escaleta (discrepancias en rojo 🔴).
  * Selección de subtítulos: Guion original, Real grabado o Corrección manual.
  * Auditoría de recursos físicos y configuración de In/Out frames y posición (slots).

### 3. Validación y Exportación del Manifiesto
```bash
cd motor
npm run check -- <CODE>
npm run export:ae -- <CODE>
```

### 4. Armado del Proyecto After Effects (.aep)
- Directamente desde el tablero web presionando `🚀 Aceptar y Generar Proyecto After Effects`.
- O mediante el runner automatizado:
```bash
python tools/build_ae_project.py <CODE> --dir "ruta/al/episodio"
```
- O en After Effects: **Archivo > Scripts > Ejecutar archivo de script...** seleccionando `ae/build-<CODE>.jsx`.

### 5. Revisión y Aprobación
Revisar la hoja de contactos generada en `episodios/<CODE>/revision/contacto.jpg` y las capas del proyecto `.aep`.

---

## Documentación Técnica
- [`SKILL.md`](SKILL.md): Protocolo completo, reglas críticas, trampas de After Effects y guía paso a paso.
- [`AGENTS.md`](AGENTS.md): Reglas operativas para agentes de IA.
- [`docs/ESTETICA.md`](docs/ESTETICA.md): Guía cromática cuatricolor, componentes y controles de capa `CONTROL`.
- [`docs/SUBTITULOS.md`](docs/SUBTITULOS.md): Estándar de subtitulado con pastilla translúcida esmerilada.
