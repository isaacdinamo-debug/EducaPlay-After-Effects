---
description: Armar un capítulo de Educaplay en After Effects, verificarlo y subirlo a GitHub (medir → data.ts → check → AE → revisión → publicar)
---

# /episodio-ae — capítulo de Educaplay en After Effects

Pedile al usuario el **código del episodio** (por ejemplo `AMB26-05`). Todos los comandos se corren
desde `motor/`. La estética es una sola, la de la plataforma Educaplay, con el modo vivo (`docs/ESTETICA.md`). La marca se escribe siempre «Educaplay». Antes de empezar, leé `AGENTS.md` y la skill `educaplay-after-effects`.

Si un paso falla, **pará y mostrale al usuario el error tal cual**. No lo esquives editando
archivos generados, escribiendo coordenadas a mano, ni saltando al paso de publicar.

## 1. Preparar

```bash
cd motor && npm ci
npm run doctor -- <CODE>
```

Si no existe `motor/.env`, copialo de `motor/.env.example` y **pedile al usuario las dos rutas**
(dónde están las entregas y de dónde traer medios en esta PC). No las inventes.

`doctor` audita la máquina y **tiene que terminar en 0 problemas** antes de seguir. Revisa:
- fuentes instaladas, After Effects y `motor/.env`;
- el plató del capítulo (ver abajo);
- que el máster sea el aprobado y estén los recursos;
- que los archivos medidos no hayan cambiado.

Si marca fuentes faltantes, pedile al usuario que las instale (en Windows, "Instalar para todos
los usuarios") y que reinicie After Effects.

Si marca **plató sin declarar** (materia nueva): muestra el color de fondo medido. Mostráselo al
usuario y preguntale en qué plató se grabó; después escribí `src/episodes/<CODE>/tracker.json` con
`{"studio": "verde"}` o `{"studio": "lila"}`. Si no es ninguno de los dos, se agrega un plató a
`src/brand/estudios.ts` (hay uno genérico por color: ver el comentario del archivo).

Si el episodio ya existe en `motor/src/episodes/<CODE>/` y sólo faltan los medios en esta máquina:

```bash
npm run medios -- <CODE>
```

(toma los medios de `EDUCAPLAY_MEDIOS`; otra carpeta: `--desde "<carpeta con public/>"`)

y pasá directo al paso 3. **No corras `npm run nuevo` sobre un episodio que ya existe**: vuelve a
medir con las herramientas de esta máquina y cambia el encuadre y los subtítulos aprobados.

## 2. Episodio nuevo: medir y escribir `data.ts`

```bash
npm run nuevo -- <CODE>
```

Mide el encuadre de la docente, transcribe con Whisper, lee la escaleta `.docx` de
`$EDUCAPLAY_EPISODES/<CODE>/` y resuelve las palabras-gatillo. Al final imprime la lista de lo que
**no puede hacer un script**. Hacé cada punto, en orden:

1. Leé la tabla de palabras-gatillo entera: un score de 1.00 dice que la palabra existe, no que el
   cue sea el correcto.
2. Anotá lo que la escaleta pide y el máster no trae.
3. **El nombre de la docente se lee de la placa quemada en el máster**: extraé un frame con
   `ffmpeg` y **confirmalo con el usuario**. Nunca lo tomes de la escaleta.
4. Leé `captions.ts`. Los errores de Whisper se corrigen con `CAPTION_FIX` en `data.ts`, nunca
   editando `captions.ts`.
5. Copiá `plantillas/data.molde.ts` (o el `data.draft.ts` generado) a
   `src/episodes/<CODE>/data.ts` y completalo. Tomá como modelo
   `src/episodes/AMB26-04/data.ts`. Decidí `intervention` (0–4): el molde no compila hasta que
   alguien la decide, a propósito.
6. Opcional, modo vivo: si la docente **enumera** algo que no está en pantalla mientras está un
   titular, proponé `chips` para ese titular (texto corto, cada uno con su cue en
   `cues.def.json`). Es contenido nuevo: **confirmalo con el usuario** antes de agregarlo, y dale
   al slot del titular el alto final (el armado avisa con ⚠ si la tarjeta no entra).

## 3. Verificar los datos

```bash
npm run check -- <CODE>
```

Tiene que terminar en `✓ todos los verificadores en verde.` Si `check-layout` dice que un bloque
pisa a la docente o un rect quemado, corregí el **slot** o el rango del bloque en `data.ts`, no la
posición.

## 4. Manifiesto para After Effects

```bash
npm run export:ae -- <CODE>
```

Informa cuántos bloques, subtítulos y assets exportó. Si algún subtítulo no entraba en dos líneas,
lo partió en páginas (lo dice).

## 5. Armar en After Effects

Pedile al usuario que **guarde y cierre** cualquier proyecto propio que tenga abierto en AE.
Después:

```bash
npm run ae -- <CODE>
```

Abre AE si hace falta, arma el capítulo en modo vivo, guarda `episodios/<CODE>/<CODE>.aep`, saca
stills y arma `episodios/<CODE>/revision/contacto.jpg`. Falla si el armado dejó alguna ⚠ o ✗, si
faltan tarjetas o subtítulos, o si falta algún still. El detalle queda en `revision/log.txt`.

Si dice que AE **no responde a scripts**: o falta tildar *Preferencias › Scripting y expresiones ›
«Permitir que los scripts escriban archivos…»*, o AE tiene un diálogo abierto esperando un clic
(recuperar proyecto, licencia). Pedile al usuario que lo mire; no reintentes en bucle.

Si dice que hay **otro proyecto abierto** y es el que dejó a medias una corrida fallida de este
flujo, se relanza con `--forzar`. Si puede ser trabajo del usuario, preguntá.

## 6. Revisión visual

Abrí `episodios/<CODE>/revision/contacto.jpg` y listale al usuario, en el chat, todo lo que se
vea mal. En especial:

- un gráfico que pisa a la docente, la marca de agua o la placa de nombre;
- texto cortado o ilegible;
- un subtítulo de más de dos líneas, o que no esquiva la placa de nombre.

Si hay algo, corregilo (en `data.ts` o en `ae/build-episode.jsx`) y volvé al paso 3.

Los stills no muestran el movimiento. Para que el usuario lo vea:

```bash
npm run preview -- <CODE>
```

Renderiza con aerender por tramos de 500 cuadros (informa el % por tramo) y deja
`episodios/<CODE>/preview/<CODE>.mp4`. Si un tramo se traba, dice cuál: casi siempre es un recurso
(ver la trampa C2PA de la skill). **Esperá el OK del usuario antes de publicar.**

## 7. Publicar

```bash
npm run publicar -- <CODE>
```

Vuelve a correr el chequeo completo (pasos 3 a 5) y, **sólo si todo pasa**:

- commitea en la rama `episodio/<CODE>`;
- hace push a `origin`;
- abre un Pull Request a `main` con la hoja de contacto.

Si falla, no toca git. Pasale al usuario el link del PR que imprime al final.
