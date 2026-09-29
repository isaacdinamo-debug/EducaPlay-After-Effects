# -*- coding: utf-8 -*-
"""
local_bridge_server.py — Servidor local Bridge para EducaPlay After Effects
Conecta el Tablero Interactivo de Sincronización Pre-Edición (HTML) con el motor de After Effects.

Uso:
  python tools/local_bridge_server.py [EPISODE_CODE] [--port 3210] [--dir <ruta_episodio>]

Endpoints:
- GET  /health      -> estado del servicio
- GET  /api/status  -> estado del proyecto AE (listo, en proceso, error, paths)
- POST /api/generate-and-preview -> recibe matriz aprobada e inicia construcción de AE
"""
import os
import sys
import json
import argparse
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler

sys.stdout.reconfigure(encoding='utf-8')

SKILL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DEFAULT_EPISODE = "AMB26-01"

parser = argparse.ArgumentParser(description="Bridge Server para EducaPlay After Effects")
parser.add_argument("code", nargs="?", default=DEFAULT_EPISODE, help="Código del episodio (ej: AMB26-01)")
parser.add_argument("--port", type=int, default=3210, help="Puerto HTTP (def: 3210)")
parser.add_argument("--dir", default=None, help="Directorio del episodio en el disco de trabajo")
args = parser.parse_args()

EPISODE_CODE = args.code
PORT = args.port
WORK_DIR = os.path.abspath(args.dir) if args.dir else os.path.join(SKILL_DIR, "episodios", EPISODE_CODE)
APPROVED_PATH = os.path.join(WORK_DIR, "TABLA_SINCRONIZACION_APROBADA.json")
EPISODIOS_DIR = os.path.join(SKILL_DIR, "episodios", EPISODE_CODE)

BUILD_STATE = {
    "is_building": False,
    "current_step": "idle",
    "message": "Listo para generar",
    "aep_ready": False,
    "aep_path": "",
    "aep_size_mb": 0.0,
    "last_updated": ""
}

def check_project_status():
    local_aep = os.path.join(WORK_DIR, f"{EPISODE_CODE}.aep")
    skill_aep = os.path.join(EPISODIOS_DIR, f"{EPISODE_CODE}.aep")
    target_aep = local_aep if os.path.exists(local_aep) else skill_aep
    
    if os.path.exists(target_aep):
        size_mb = round(os.path.getsize(target_aep) / (1024 * 1024), 2)
        BUILD_STATE["aep_ready"] = True
        BUILD_STATE["aep_path"] = target_aep
        BUILD_STATE["aep_size_mb"] = size_mb
    else:
        BUILD_STATE["aep_ready"] = False
        BUILD_STATE["aep_path"] = ""
        BUILD_STATE["aep_size_mb"] = 0.0

def run_build_async(matrix_data):
    BUILD_STATE["is_building"] = True
    BUILD_STATE["current_step"] = "exporting_manifest"
    BUILD_STATE["message"] = "Exportando manifiesto y optimizando recursos..."
    
    try:
        sys.path.insert(0, os.path.dirname(__file__))
        import build_ae_project
        BUILD_STATE["current_step"] = "building_ae"
        BUILD_STATE["message"] = "Ejecutando constructor en After Effects..."
        
        success = build_ae_project.build_ae(EPISODE_CODE, WORK_DIR, matrix_data)
        check_project_status()
        
        if success or BUILD_STATE["aep_ready"]:
            BUILD_STATE["is_building"] = False
            BUILD_STATE["current_step"] = "completed"
            BUILD_STATE["message"] = "¡Proyecto de After Effects generado con éxito!"
        else:
            BUILD_STATE["is_building"] = False
            BUILD_STATE["current_step"] = "ready_to_run_script"
            BUILD_STATE["message"] = f"Manifiesto listo. Ejecutá build-{EPISODE_CODE}.jsx en After Effects."
    except Exception as e:
        BUILD_STATE["is_building"] = False
        BUILD_STATE["current_step"] = "error"
        BUILD_STATE["message"] = f"Error: {str(e)}"

class BridgeRequestHandler(BaseHTTPRequestHandler):
    def _send_cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors()
        self.end_headers()

    def do_GET(self):
        if self.path in ('/health', '/api/health'):
            self.send_response(200)
            self._send_cors()
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            resp = {"status": "ok", "service": "educaplay-ae-bridge", "episode": EPISODE_CODE, "port": PORT}
            self.wfile.write(json.dumps(resp).encode('utf-8'))
        elif self.path in ('/status', '/api/status'):
            check_project_status()
            self.send_response(200)
            self._send_cors()
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(BUILD_STATE, ensure_ascii=False).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path in ('/api/generate-and-preview', '/generate-and-preview'):
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)

            try:
                matrix_data = json.loads(body.decode('utf-8'))
            except Exception as e:
                print(f"[Bridge Error] Falló JSON: {e}")
                matrix_data = {}

            # Guardar matriz aprobada
            os.makedirs(WORK_DIR, exist_ok=True)
            with open(APPROVED_PATH, "w", encoding="utf-8") as f:
                json.dump(matrix_data, f, indent=2, ensure_ascii=False)
            print(f"[Bridge] Guardado {APPROVED_PATH}")

            # Iniciar compilación asíncrona
            threading.Thread(target=run_build_async, args=(matrix_data,), daemon=True).start()

            self.send_response(200)
            self._send_cors()
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            resp = {
                "status": "started",
                "message": "Construcción iniciada. Monitoreando estado..."
            }
            self.wfile.write(json.dumps(resp, ensure_ascii=False).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

def run_server():
    check_project_status()
    server = HTTPServer(('127.0.0.1', PORT), BridgeRequestHandler)
    print(f"📡 Bridge Server ({EPISODE_CODE}) activo en http://127.0.0.1:{PORT}")
    print(f"   Directorio de trabajo: {WORK_DIR}")
    print("   Endpoints: /health, /api/status, /api/generate-and-preview")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")

if __name__ == "__main__":
    run_server()
