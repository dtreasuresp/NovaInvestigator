"""
server.py - Servidor Flask para generar PDF con Chrome Headless
"""

from flask import Flask, request, send_file, send_from_directory, jsonify
from generar_graficos import generar_todos_los_graficos
import setup_api
import tempfile
import os
import subprocess
import json
import shutil
import socket
import sys
import threading
import time
import webbrowser
from pathlib import Path
from datetime import datetime

app = Flask(__name__)

APP_VERSION = '0.1.0'

def application_base_dir():
    configured_dir = os.environ.get('APP_BASE_DIR')
    if configured_dir:
        return Path(configured_dir).resolve()
    if getattr(sys, 'frozen', False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


BASE_DIR = application_base_dir()
RESOURCE_DIR = Path(getattr(sys, '_MEIPASS', BASE_DIR)).resolve()
FRONTEND_DIST = str(RESOURCE_DIR / 'frontend' / 'dist')

# Navegadores compatibles, en el mismo orden de preferencia que el asistente de configuración.
BROWSER_PATHS = [
    os.environ.get('BROWSER_PATH'),
    os.environ.get('CHROME_PATH'),
    str(BASE_DIR / 'runtime' / 'browser' / 'chrome.exe'),
    str(BASE_DIR / 'runtime' / 'browser' / 'msedge.exe'),
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    shutil.which('chrome'),
    shutil.which('msedge'),
]


def encontrar_navegador():
    for browser_path in BROWSER_PATHS:
        if browser_path and os.path.isfile(browser_path):
            return browser_path
    raise FileNotFoundError('No se encontró Chrome ni Edge. Instale uno o incluya un navegador en runtime/browser.')


def encontrar_puerto(preferred_port):
    candidates = [preferred_port, *range(5002, 5011)]
    for port in candidates:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            try:
                sock.bind(('127.0.0.1', port))
                return port
            except OSError:
                continue
    raise OSError('No hay un puerto local disponible para la aplicación.')


def abrir_navegador_cuando_este_listo(port, url):
    for _ in range(600):
        try:
            with socket.create_connection(('127.0.0.1', port), timeout=0.2):
                webbrowser.open(f'http://localhost:{port}{url}')
                return
        except OSError:
            time.sleep(0.1)


def normalizar_datos_graficos(datos):
    """Acepta el payload plano actual y el formato de estado legacy."""
    datos = datos if isinstance(datos, dict) else {}
    analysis = datos.get('analysis') or {}
    efi = analysis.get('efi') or {}
    efe = analysis.get('efe') or {}

    def factor_data(factor):
        factor = factor if isinstance(factor, dict) else {}
        score = factor.get('puntaje', factor.get('score'))
        if score is None:
            score = float(factor.get('weight') or 0) * float(factor.get('rating') or 0)
        return {
            'nombre': factor.get('nombre') or factor.get('name') or factor.get('id') or 'Factor sin nombre',
            'puntaje': float(score or 0),
        }

    def factors_by_type(factors, factor_type):
        return [factor_data(factor) for factor in factors if factor.get('type') == factor_type]

    internal = datos.get('internal') or efi.get('factors') or []
    external = datos.get('external') or efe.get('factors') or []
    dafo = datos.get('dafo') or {}
    analysis_dafo = analysis.get('dafo') or {}
    return {
        'fortalezas': datos.get('fortalezas') or factors_by_type(internal, 'F'),
        'debilidades': datos.get('debilidades') or factors_by_type(internal, 'D'),
        'oportunidades': datos.get('oportunidades') or factors_by_type(external, 'O'),
        'amenazas': datos.get('amenazas') or factors_by_type(external, 'A'),
        'dafo': {
            'fo': dafo.get('fo', analysis_dafo.get('FO', 0)),
            'fa': dafo.get('fa', analysis_dafo.get('FA', 0)),
            'do': dafo.get('do', analysis_dafo.get('DO', 0)),
            'da': dafo.get('da', analysis_dafo.get('DA', 0)),
        },
        'efi_score': datos.get('efi_score', efi.get('total', 0)),
        'efe_score': datos.get('efe_score', efe.get('total', 0)),
    }


def insertar_graficos(html_content, datos_analisis):
    graficos = generar_todos_los_graficos(normalizar_datos_graficos(datos_analisis))
    for nombre, b64 in graficos.items():
        img_tag = f'<img src="data:image/png;base64,{b64}" style="max-width:100%;height:auto;">'
        html_content = html_content.replace(f'{{{{GRAFICO_{nombre.upper()}}}}}', img_tag)
    return html_content


def generar_pdf_chrome(html_content, output_path):
    """
    Genera PDF usando Chrome headless
    
    Args:
        html_content: str - HTML completo para renderizar
        output_path: str - Ruta donde guardar el PDF
    """
    # Crear archivo HTML temporal
    with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False, encoding='utf-8') as f:
        f.write(html_content)
        html_path = f.name
    
    try:
        # Chrome necesita crear el PDF; una ruta creada previamente puede quedar vacía en Windows.
        if os.path.exists(output_path):
            os.remove(output_path)

        # Comando de Chrome para generar PDF
        cmd = [
            encontrar_navegador(),
            '--headless',
            '--disable-gpu',
            '--no-sandbox',
            '--print-to-pdf=' + output_path,
            '--print-to-pdf-no-header',
            Path(html_path).resolve().as_uri(),
        ]
        
        # Ejecutar Chrome
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        
        if result.returncode != 0:
            raise Exception(f"Error de Chrome: {result.stderr}")
        if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
            raise Exception('Chrome no generó un PDF válido.')
        
        return True
        
    finally:
        # Eliminar archivo temporal
        if os.path.exists(html_path):
            os.remove(html_path)


@app.route('/', defaults={'path': ''}, methods=['GET'])
@app.route('/<path:path>', methods=['GET'])
def serve_frontend(path):
    """Sirve el build React (SPA en frontend/dist)."""
    if os.path.isdir(FRONTEND_DIST):
        if path:
            requested_file = os.path.join(FRONTEND_DIST, path)
            if os.path.isfile(requested_file):
                return send_from_directory(FRONTEND_DIST, path)
        return send_from_directory(FRONTEND_DIST, 'index.html')
    return (
        'frontend/dist no encontrado. Ejecuta <code>npm run build</code> '
        'en la carpeta del proyecto y vuelve a iniciar.',
        503,
    )


@app.route('/api/health')
def api_health():
    """Estado del servidor; el wizard lo usa para decidir modo bootstrap/full/portable."""
    return jsonify({'ok': True, 'mode': 'portable' if setup_api.is_portable() else 'full', 'version': APP_VERSION})


@app.route('/api/check-all')
def api_check_all():
    return jsonify(setup_api.run_all_checks())


@app.route('/api/check/<name>')
def api_check(name):
    return jsonify(setup_api.run_single_check(name))


@app.route('/api/port/<int:port>')
def api_port(port):
    return jsonify(setup_api.check_port(port))


@app.route('/api/ports/available')
def api_ports_available():
    return jsonify(setup_api.get_available_ports())


@app.route('/api/install', methods=['POST'])
def api_install():
    data = request.get_json(silent=True) or {}
    return jsonify(setup_api.install_package(data.get('package', '')))


@app.route('/api/start-app', methods=['POST'])
def api_start_app():
    """Modo full/portable: la app ya está corriendo; solo informa la URL."""
    data = request.get_json(silent=True) or {}
    port = int(data.get('port', setup_api.APP_PORT))
    return jsonify({'success': True, 'url': f'http://localhost:{port}/app/context'})


@app.route('/generar-pdf', methods=['POST'])
def generar_pdf():
    """Genera PDF completo con Chrome headless"""
    pdf_path = None
    try:
        data = request.get_json(silent=True) or {}
        html_content = data.get('html', '')
        datos_analisis = data.get('datos', {})
        if not html_content.strip():
            raise ValueError('El informe HTML está vacío.')

        html_content = insertar_graficos(html_content, datos_analisis)

        # Generar PDF con Chrome headless
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
            pdf_path = tmp.name

        generar_pdf_chrome(html_content, pdf_path)

        # Enviar archivo
        response = send_file(
            pdf_path,
            as_attachment=True,
            download_name='analisis-estrategico-completo.pdf',
            mimetype='application/pdf'
        )

        def eliminar_pdf_temporal():
            if pdf_path and os.path.exists(pdf_path):
                try:
                    os.remove(pdf_path)
                except PermissionError:
                    pass

        response.call_on_close(eliminar_pdf_temporal)
        return response
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/generar-pdf-local', methods=['POST'])
def generar_pdf_local():
    """Genera PDF y guarda en ubicación local"""
    try:
        data = request.get_json(silent=True) or {}
        html_content = data.get('html', '')
        datos_analisis = data.get('datos', {})
        output_path = data.get('output_path', 'analisis-estrategico-completo.pdf')

        if not html_content.strip():
            raise ValueError('El informe HTML está vacío.')

        html_content = insertar_graficos(html_content, datos_analisis)

        # Generar PDF
        generar_pdf_chrome(html_content, output_path)
        
        return jsonify({
            'success': True,
            'path': output_path,
            'message': f'PDF generado exitosamente en: {output_path}'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    from waitress import serve

    print("=" * 50)
    print("Servidor de Análisis Estratégico")
    print("=" * 50)
    requested_port = int(os.environ.get('FLASK_PORT', '5000'))
    port_file = os.environ.get('PORT_FILE')
    busca_puerto = os.environ.get('OPEN_BROWSER') == '1' or bool(port_file)
    app_port = encontrar_puerto(requested_port) if busca_puerto else requested_port
    if port_file:
        try:
            with open(port_file, 'w', encoding='utf-8') as f:
                f.write(str(app_port))
        except OSError as error:
            print(f"AVISO: No se pudo escribir el puerto en {port_file}: {error}")
    print(f"Abre tu navegador en: http://localhost:{app_port}")
    print("Presiona Ctrl+C para detener el servidor")
    print("=" * 50)

    if os.environ.get('OPEN_BROWSER') == '1':
        initial_url = '/setup' if setup_api.is_portable() else '/app/context'
        threading.Thread(
            target=abrir_navegador_cuando_este_listo,
            args=(app_port, initial_url),
            daemon=True,
        ).start()

    serve(app, host='127.0.0.1', port=app_port, threads=4)
