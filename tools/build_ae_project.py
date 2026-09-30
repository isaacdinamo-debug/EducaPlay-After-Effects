# -*- coding: utf-8 -*-
"""
build_ae_project.py — Automatización para generar el proyecto de After Effects
tras la aprobación de la Matriz de Sincronización Pre-Edición.

Uso:
  python tools/build_ae_project.py [EPISODE_CODE] [--dir <ruta_episodio>]
"""
import os
import sys
import json
import shutil
import argparse
import subprocess

sys.stdout.reconfigure(encoding='utf-8')

SKILL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MOTOR_DIR = os.path.join(SKILL_DIR, "motor")

def find_ae_binary():
    """Detecta la ruta del ejecutable de After Effects en Windows y macOS."""
    if sys.platform == "win32":
        candidates = [
            r"C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\AfterFX.exe",
            r"C:\Program Files\Adobe\Adobe After Effects 2025\Support Files\AfterFX.exe",
            r"C:\Program Files\Adobe\Adobe After Effects 2024\Support Files\AfterFX.exe",
            r"C:\Program Files\Adobe\Adobe After Effects CC 2023\Support Files\AfterFX.exe",
        ]
        for c in candidates:
            if os.path.exists(c):
                return c
        return "AfterFX.exe"
    elif sys.platform == "darwin":
        candidates = [
            "/Applications/Adobe After Effects 2026/Adobe After Effects 2026.app/Contents/MacOS/After Effects",
            "/Applications/Adobe After Effects 2025/Adobe After Effects 2025.app/Contents/MacOS/After Effects",
            "/Applications/Adobe After Effects 2024/Adobe After Effects 2024.app/Contents/MacOS/After Effects",
        ]
        for c in candidates:
            if os.path.exists(c):
                return c
        return "aerender"
    return "AfterFX"

def build_ae(episode_code, work_dir=None, matrix_data=None):
    if not work_dir:
        work_dir = os.path.join(SKILL_DIR, "episodios", episode_code)
    
    episodios_dir = os.path.join(SKILL_DIR, "episodios", episode_code)
    ae_exe = find_ae_binary()

    print("=" * 70)
    print(f"🚀 GENERANDO PROYECTO AFTER EFFECTS — {episode_code}")
    print(f"   Directorio de trabajo: {work_dir}")
    print("=" * 70)

    # 1. Guardar o validar archivo de datos aprobados
    aprobada_path = os.path.join(work_dir, "TABLA_SINCRONIZACION_APROBADA.json")
    if matrix_data:
        os.makedirs(work_dir, exist_ok=True)
        with open(aprobada_path, "w", encoding="utf-8") as f:
            json.dump(matrix_data, f, indent=2, ensure_ascii=False)
        print(f"✓ Guardado estado de matriz aprobada: {aprobada_path}")
    elif not os.path.exists(aprobada_path):
        datos_path = os.path.join(work_dir, "TABLA_SINCRONIZACION_DATOS.json")
        if os.path.exists(datos_path):
            shutil.copy2(datos_path, aprobada_path)
            print(f"✓ Copiado {datos_path} → {aprobada_path}")

    # 2. Exportar manifiesto AE desde el motor
    print("\n📦 Paso 1: Exportando manifiesto AE y preparando assets desde el motor...")
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    res_export = subprocess.run(
        [npm_cmd, "run", "export:ae", "--", episode_code],
        cwd=MOTOR_DIR,
        capture_output=True,
        text=True
    )
    if res_export.stdout:
        print(res_export.stdout.strip())
    if res_export.returncode != 0:
        print(f"✗ Error al exportar manifiesto: {res_export.stderr}")
        return False

    # 3. Asegurar que build-[CODE].jsx esté en la carpeta del episodio y en ae/
    jsx_skill_path = os.path.join(SKILL_DIR, "ae", f"build-{episode_code}.jsx")
    jsx_local_path = os.path.join(work_dir, f"build-{episode_code}.jsx")
    
    if not os.path.exists(jsx_skill_path):
        template_path = os.path.join(SKILL_DIR, "ae", "build-episode.jsx")
        manifest_path = os.path.join(episodios_dir, "manifest.json").replace("\\", "/")
        with open(template_path, "r", encoding="utf-8") as f:
            jsx_code = f.read()
        jsx_code = jsx_code.replace("EPISODIO_PLACEHOLDER", episode_code)
        jsx_code = jsx_code.replace("MANIFEST_PATH_PLACEHOLDER", manifest_path)
        with open(jsx_skill_path, "w", encoding="utf-8") as f:
            f.write(jsx_code)
        print(f"✓ Creado script constructor: {jsx_skill_path}")

    if os.path.exists(jsx_skill_path) and os.path.abspath(jsx_skill_path) != os.path.abspath(jsx_local_path):
        shutil.copy2(jsx_skill_path, jsx_local_path)
        print(f"✓ Script constructor sincronizado en:\n   {jsx_local_path}")

    # 4. Lanzar After Effects
    print(f"\n🎬 Paso 2: Lanzando constructor en After Effects ({ae_exe})...")
    try:
        subprocess.Popen([ae_exe, "-r", jsx_skill_path])
        print("✓ Comando de ejecución enviado a After Effects (-r)")
    except Exception as e:
        print(f"⚠ Aviso al lanzar After Effects automáticamente: {e}")
        print("Podés ejecutar el armado directamente desde After Effects:")
        print(f"   Archivo > Scripts > Ejecutar archivo de script... > {jsx_skill_path}")

    # 5. Sincronizar .aep si existe
    aep_source = os.path.join(episodios_dir, f"{episode_code}.aep")
    aep_dest = os.path.join(work_dir, f"{episode_code}.aep")
    if os.path.exists(aep_source) and os.path.abspath(aep_source) != os.path.abspath(aep_dest):
        shutil.copy2(aep_source, aep_dest)
        print(f"\n✓ Archivo de proyecto sincronizado:\n   {aep_dest}")

    print("\n" + "=" * 70)
    print("✅ PROCESO COMPLETADO")
    print(f"El proyecto After Effects para {episode_code} está listo.")
    print("=" * 70)
    return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Constructor de proyecto AE para EducaPlay")
    parser.add_argument("code", nargs="?", default="AMB26-01", help="Código del episodio (ej: AMB26-01)")
    parser.add_argument("--dir", default=None, help="Directorio del episodio de trabajo")
    args = parser.parse_args()
    build_ae(args.code, args.dir)
