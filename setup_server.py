"""
setup_server.py - Servidor bootstrap (stdlib) para el asistente de configuración

Modo 'bootstrap': se ejecuta cuando faltan dependencias (primer uso).
Puerto: 5000 (fallback 5002-5010). En el handoff cede el puerto a server.py.
"""

import http.server
import json
import os
import socket
import subprocess
import threading
import time
import urllib.request
import webbrowser
from pathlib import Path

import setup_api
from setup_api import (
    APP_PORT,
    BASE_DIR,
    DIST_DIR,
    SETUP_PORT,
    check_port,
    find_available_port,
    get_available_ports,
    install_package,
    port_in_use,
    run_all_checks,
    run_single_check,
)

_handoff_thread = None


class SetupHTTPHandler(http.server.SimpleHTTPRequestHandler):
    """Handler para el servidor de configuración"""

    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.woff2': 'font/woff2',
        '.js': 'application/javascript',
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST_DIR), **kwargs)

    def do_GET(self):
        path = self.path.split('?')[0]
        if path in ('/', ''):
            self._redirect_to_setup()
        elif path == '/api/health':
            self._send_json({'ok': True, 'mode': 'bootstrap'})
        elif path == '/api/check-all':
            self._send_json(run_all_checks())
        elif path.startswith('/api/check/'):
            self._send_json(run_single_check(path.split('/')[-1]))
        elif path.startswith('/api/port/'):
            self._send_json(check_port(int(path.split('/')[-1])))
        elif path == '/api/ports/available':
            self._send_json(get_available_ports())
        elif path == '/favicon.ico':
            self.send_response(204)
            self.end_headers()
        else:
            self._serve_or_fallback(path)

    def _serve_or_fallback(self, path):
        """Sirve el archivo si existe; si no, cae al index.html (SPA: /setup, /app/*, etc.)."""
        requested_file = (DIST_DIR / path.lstrip('/')).resolve()
        if not (str(requested_file).startswith(str(DIST_DIR.resolve())) and requested_file.is_file()):
            self.path = '/index.html'
        super().do_GET()

    def _redirect_to_setup(self):
        if (DIST_DIR / 'index.html').is_file():
            self.send_response(302)
            self.send_header('Location', '/setup')
            self.end_headers()
        else:
            self.send_response(503)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(
                (
                    '<!doctype html><html lang="es"><head><meta charset="utf-8">'
                    '<title>Interfaz no compilada</title>'
                    '<style>body{font-family:system-ui,sans-serif;background:#0f3d4c;color:#fff;'
                    'display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}'
                    '.box{max-width:520px;text-align:center;padding:32px}'
                    'code{background:rgba(255,255,255,.15);padding:2px 8px;border-radius:6px}</style>'
                    '</head><body><div class="box"><h1>Interfaz no compilada</h1>'
                    '<p>No se encontró <code>frontend/dist/index.html</code>. '
                    'Ejecuta <code>npm run build</code> en la carpeta del proyecto y vuelve a iniciar.</p>'
                    '</div></body></html>'
                ).encode('utf-8')
            )

    def do_POST(self):
        if self.path == '/api/install':
            self._handle_install()
        elif self.path == '/api/start-app':
            self._handle_start_app()
        else:
            self.send_error(404)

    def _handle_install(self):
        content_length = int(self.headers['Content-Length'])
        body = json.loads(self.rfile.read(content_length))
        self._send_json(install_package(body.get('package', '')))

    def _handle_start_app(self):
        global _handoff_thread
        content_length = int(self.headers['Content-Length'])
        body = json.loads(self.rfile.read(content_length))
        port = body.get('port', APP_PORT)

        server_path = str(BASE_DIR / 'server.py')
        if not os.path.exists(server_path):
            self._send_json({'success': False, 'error': 'server.py no encontrado'})
            return

        executable = setup_api.runtime_python()
        if not os.path.isfile(executable):
            self._send_json({'success': False, 'error': f'Intérprete Python no encontrado: {executable}'})
            return

        # Responder antes del handoff para que el wizard empiece el poll de /api/health.
        self._send_json({
            'success': True,
            'message': f'Servidor iniciado en http://localhost:{port}',
            'url': f'http://localhost:{port}/app/context'
        })

        global _handoff_thread
        _handoff_thread = threading.Thread(
            target=self._perform_handoff,
            args=(int(port), executable, server_path),
            daemon=True,
        )
        _handoff_thread.start()

    def _perform_handoff(self, port, executable, server_path):
        """Cede el puerto y lanza server.py. Debe correr en un hilo distinto a serve_forever."""
        try:
            self.server.shutdown()
        except Exception:
            pass

        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            if not port_in_use(port):
                break
            time.sleep(0.1)

        env = os.environ.copy()
        env['FLASK_PORT'] = str(port)
        env['OPEN_BROWSER'] = '0'
        try:
            process = subprocess.Popen([executable, server_path], cwd=str(BASE_DIR), env=env)
        except OSError as error:
            print(f'Error lanzando server.py: {error}')
            return

        deadline = time.monotonic() + 15
        while time.monotonic() < deadline:
            if process.poll() is not None:
                print('server.py terminó antes de abrir el puerto. Revise dependencias y registro.')
                return
            if port_in_use(port):
                print(f'Aplicación iniciada en http://localhost:{port}')
                return
            time.sleep(0.2)

    def _send_json(self, data):
        response = json.dumps(data, ensure_ascii=False)
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(response.encode('utf-8'))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def log_message(self, format, *args):
        pass  # Silenciar logs


def app_ya_corriendo(port):
    """True si el puerto responde /api/health de la aplicación (mode full/portable)."""
    try:
        with urllib.request.urlopen(f'http://127.0.0.1:{port}/api/health', timeout=2) as response:
            data = json.loads(response.read().decode('utf-8'))
            return data.get('ok') is True
    except Exception:
        return False


def main():
    global _handoff_thread

    setup_port = find_available_port(SETUP_PORT, range(5002, 5011))
    if setup_port is None:
        if app_ya_corriendo(SETUP_PORT):
            webbrowser.open(f'http://localhost:{SETUP_PORT}/app/context')
            print('La aplicación ya está en ejecución.')
            return 0
        print('No hay un puerto disponible para el asistente de configuración.')
        return 1

    print("=" * 60)
    print("  ASISTENTE DE CONFIGURACIÓN")
    print("  Análisis Estratégico EFI/EFE/DAFO/CAME")
    print("=" * 60)
    print()
    print(f"  Abre tu navegador en: http://localhost:{setup_port}/setup")
    print()
    print("  Presiona Ctrl+C para cerrar")
    print("=" * 60)

    server = http.server.ThreadingHTTPServer(('127.0.0.1', setup_port), SetupHTTPHandler)
    if os.environ.get('OPEN_BROWSER') != '0':
        threading.Timer(
            0.3,
            lambda: webbrowser.open(f'http://localhost:{setup_port}/setup')
        ).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nAsistente cerrado.")
    finally:
        server.server_close()

    if _handoff_thread is not None:
        _handoff_thread.join(timeout=25)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
