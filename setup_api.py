"""
setup_api.py - Lógica compartida del asistente de configuración (stdlib puro, sin Flask)

Usado por:
- setup_server.py (modo bootstrap: dependencias faltantes)
- server.py (modo full / portable)

Mantiene una sola implementación de la API del wizard: checks, instalación y arranque.
"""

import http.server
import json
import os
import sys
import socket
import subprocess
import platform
import time
from pathlib import Path

# Configuración
SETUP_PORT = 5000
APP_PORT = 5000
BASE_DIR = Path(__file__).parent
DIST_DIR = BASE_DIR / 'frontend' / 'dist'
VENV_DIR = BASE_DIR / '.venv'
VENV_PYTHON = VENV_DIR / ('Scripts' if os.name == 'nt' else 'bin') / ('python.exe' if os.name == 'nt' else 'python')

# Rutas de navegadores conocidos
BROWSER_PATHS = {
    'chrome': {
        'Windows': [
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        ],
        'Darwin': ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"],
        'Linux': ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable"],
    },
    'edge': {
        'Windows': [
            r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        ],
        'Darwin': ["/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"],
        'Linux': ["/usr/bin/microsoft-edge", "/usr/bin/microsoft-edge-stable"],
    }
}

# Paquetes requeridos
REQUIRED_PACKAGES = {
    'flask': {'import': 'flask', 'distribution': 'flask', 'pip': 'flask>=3.0.0', 'min': '3.0.0', 'desc': 'Servidor web Flask'},
    'waitress': {'import': 'waitress', 'distribution': 'waitress', 'pip': 'waitress>=3.0.0', 'min': '3.0.0', 'desc': 'Servidor WSGI de producción'},
    'matplotlib': {'import': 'matplotlib', 'distribution': 'matplotlib', 'pip': 'matplotlib>=3.8.0', 'min': '3.8.0', 'desc': 'Generación de gráficos'},
    'numpy': {'import': 'numpy', 'distribution': 'numpy', 'pip': 'numpy>=1.24.0', 'min': '1.24.0', 'desc': 'Cálculo numérico'},
    'pillow': {'import': 'PIL', 'distribution': 'pillow', 'pip': 'pillow>=10.0.0', 'min': '10.0.0', 'desc': 'Manejo de imágenes'},
}


def is_portable():
    """True cuando el proceso corre dentro del exe PyInstaller."""
    return bool(getattr(sys, 'frozen', False))


def runtime_python():
    """Devuelve el intérprete local si el proyecto ya tiene un entorno preparado."""
    if VENV_PYTHON.is_file():
        return str(VENV_PYTHON)
    return sys.executable


def ensure_local_environment():
    """Crea el entorno local para que las dependencias no se instalen globalmente."""
    if VENV_PYTHON.is_file():
        return {'status': 'ok', 'path': str(VENV_PYTHON), 'message': 'Entorno local disponible'}

    try:
        result = subprocess.run(
            [sys.executable, '-m', 'venv', str(VENV_DIR)],
            capture_output=True,
            text=True,
            timeout=120,
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        return {
            'status': 'warning',
            'path': sys.executable,
            'message': f'No se pudo crear el entorno local: {error}',
        }

    if result.returncode != 0 or not VENV_PYTHON.is_file():
        detail = result.stderr.strip() or 'Python no creó el ejecutable del entorno.'
        return {
            'status': 'warning',
            'path': sys.executable,
            'message': f'No se pudo crear el entorno local: {detail}',
        }

    return {'status': 'ok', 'path': str(VENV_PYTHON), 'message': 'Entorno local creado'}


def runtime_version(executable):
    try:
        result = subprocess.run(
            [executable, '-c', 'import sys; print(".".join(map(str, sys.version_info[:3])))'],
            capture_output=True,
            text=True,
            timeout=10,
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        return None, str(error)

    if result.returncode != 0:
        return None, result.stderr.strip() or 'No se pudo consultar la versión de Python.'
    return result.stdout.strip(), None


def find_available_port(preferred, alternatives):
    for port in [preferred, *alternatives]:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            sock.bind(('127.0.0.1', port))
            return port
        except OSError:
            pass
        finally:
            sock.close()
    return None


def check_python():
    executable = runtime_python()
    version, error = runtime_version(executable)
    if error:
        return {
            'status': 'error',
            'version': '?',
            'executable': executable,
            'message': f'No se pudo iniciar Python: {error}',
        }

    version_parts = tuple(int(part) for part in version.split('.'))
    ok = version_parts >= (3, 8)
    return {
        'status': 'ok' if ok else 'error',
        'version': version,
        'executable': executable,
        'message': f'Python {version}' + ('' if ok else ' - Se requiere >= 3.8')
    }


def check_package(key):
    pkg = REQUIRED_PACKAGES[key]
    check_code = (
        'import importlib, importlib.metadata, sys; '
        'importlib.import_module(sys.argv[1]); '
        'print(importlib.metadata.version(sys.argv[2]))'
    )
    try:
        result = subprocess.run(
            [runtime_python(), '-c', check_code, pkg['import'], pkg['distribution']],
            capture_output=True,
            text=True,
            timeout=20,
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        return {'status': 'error', 'message': f'No se pudo comprobar {key}: {error}'}

    if result.returncode == 0:
        version = result.stdout.strip() or '?'
        return {'status': 'ok', 'version': version, 'message': f'{key} {version} instalado'}
    return {'status': 'missing', 'message': f'{key} no instalado'}


def check_browser():
    system = platform.system()
    found_browsers = []

    for browser_name, paths in BROWSER_PATHS.items():
        system_paths = paths.get(system, [])
        for path in system_paths:
            if os.path.isfile(path):
                found_browsers.append({
                    'name': browser_name,
                    'path': path,
                    'display': browser_name.capitalize()
                })
                break

    if found_browsers:
        primary = found_browsers[0]
        return {
            'status': 'ok',
            'primary': primary,
            'all': found_browsers,
            'message': f'{primary["display"]} encontrado'
        }
    else:
        return {
            'status': 'error',
            'primary': None,
            'all': [],
            'message': 'Navegador no encontrado. Se requiere Chrome o Edge.'
        }


def check_port(port):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(2)
    try:
        sock.bind(('127.0.0.1', port))
        return {'status': 'ok', 'port': port, 'message': f'Puerto {port} disponible'}
    except OSError:
        return {'status': 'error', 'port': port, 'message': f'Puerto {port} en uso'}
    finally:
        sock.close()


def get_available_ports():
    """Retorna lista de puertos disponibles (5002-5010)"""
    available = []
    for port in range(5002, 5011):
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        try:
            sock.bind(('127.0.0.1', port))
            available.append(port)
        except OSError:
            pass
        finally:
            sock.close()
    return {'ports': available}


def run_all_checks():
    environment = ensure_local_environment()
    return {
        'environment': environment,
        'python': check_python(),
        'packages': {k: check_package(k) for k in REQUIRED_PACKAGES},
        'browser': check_browser(),
    }


def run_single_check(name):
    checks = {
        'python': check_python,
        'browser': check_browser,
    }
    if name in checks:
        return checks[name]()
    if name in REQUIRED_PACKAGES:
        return check_package(name)
    return {'error': f'Check desconocido: {name}'}


def install_package(key):
    """Instala un paquete en el entorno local. Devuelve dict de resultado."""
    if is_portable():
        return {'success': False, 'error': 'No disponible en versión portable'}

    if key not in REQUIRED_PACKAGES:
        return {'success': False, 'error': 'Paquete desconocido'}

    pkg = REQUIRED_PACKAGES[key]
    environment = ensure_local_environment()
    if environment['status'] != 'ok':
        return {'success': False, 'error': environment['message']}

    cmd = [runtime_python(), '-m', 'pip', 'install', '--disable-pip-version-check', pkg['pip']]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        success = result.returncode == 0
        return {
            'success': success,
            'stdout': result.stdout,
            'stderr': result.stderr,
            'message': f'Instalado {key}' if success else f'Error instalando {key}'
        }
    except subprocess.TimeoutExpired:
        return {'success': False, 'error': 'Tiempo de instalación agotado'}
    except Exception as error:
        return {'success': False, 'error': str(error)}


def port_in_use(port):
    """True si algo está escuchando en el puerto."""
    try:
        with socket.create_connection(('127.0.0.1', int(port)), timeout=0.3):
            return True
    except OSError:
        return False
