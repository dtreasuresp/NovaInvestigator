"""
generar_graficos.py - Genera gráficos de radar y barras con matplotlib
para inclusión en el PDF exportado
"""

import matplotlib
matplotlib.use('Agg')  # Backend no interactivo
import matplotlib.pyplot as plt
import numpy as np
import base64
from io import BytesIO


def crear_grafico_radar(datos):
    """
    Genera gráfico de radar con los factores del análisis estratégico.
    
    Args:
        datos: dict con las siguientes claves:
            - fortalezas: list de dicts con 'nombre' y 'puntaje'
            - debilidades: list de dicts con 'nombre' y 'puntaje'
            - oportunidades: list de dicts con 'nombre' y 'puntaje'
            - amenazas: list de dicts con 'nombre' y 'puntaje'
    
    Returns:
        str: Imagen en base64
    """
    # Preparar datos
    categorias = []
    valores = []
    colores = []
    
    # Fortalezas (verde)
    for f in datos.get('fortalezas', []):
        categorias.append(f['nombre'][:15])
        valores.append(f['puntaje'])
        colores.append('#27ae60')
    
    # Debilidades (rojo)
    for d in datos.get('debilidades', []):
        categorias.append(d['nombre'][:15])
        valores.append(abs(d['puntaje']))
        colores.append('#e74c3c')
    
    # Oportunidades (azul)
    for o in datos.get('oportunidades', []):
        categorias.append(o['nombre'][:15])
        valores.append(o['puntaje'])
        colores.append('#3498db')
    
    # Amenazas (naranja)
    for a in datos.get('amenazas', []):
        categorias.append(a['nombre'][:15])
        valores.append(abs(a['puntaje']))
        colores.append('#f39c12')
    
    if not categorias:
        return None
    
    # Configurar gráfico radar
    num_vars = len(categorias)
    angles = np.linspace(0, 2 * np.pi, num_vars, endpoint=False).tolist()
    valores_plot = valores + valores[:1]  # Cerrar el polígono
    angles += angles[:1]
    
    fig, ax = plt.subplots(figsize=(8, 8), subplot_kw=dict(polar=True))
    
    # Dibujar polígono
    ax.fill(angles, valores_plot, color='#3498db', alpha=0.25)
    ax.plot(angles, valores_plot, color='#3498db', linewidth=2)
    
    # Agregar puntos
    for i, (angle, valor, color) in enumerate(zip(angles[:-1], valores, colores)):
        ax.plot(angle, valor, 'o', color=color, markersize=8)
    
    # Configurar etiquetas
    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(categorias, size=8)
    
    # Configurar ejes
    max_val = max(valores) if valores else 1
    ax.set_ylim(0, max_val * 1.2)
    ax.set_title('Análisis Estratégico - Factores', size=14, fontweight='bold', pad=20)
    
    # Leyenda
    from matplotlib.patches import Patch
    legend_elements = [
        Patch(facecolor='#27ae60', label='Fortalezas'),
        Patch(facecolor='#e74c3c', label='Debilidades'),
        Patch(facecolor='#3498db', label='Oportunidades'),
        Patch(facecolor='#f39c12', label='Amenazas')
    ]
    ax.legend(handles=legend_elements, loc='upper right', bbox_to_anchor=(1.3, 1.1))
    
    plt.tight_layout()
    
    # Convertir a base64
    buffer = BytesIO()
    plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight')
    plt.close(fig)
    buffer.seek(0)
    
    return base64.b64encode(buffer.getvalue()).decode('utf-8')


def crear_grafico_barras(resultados_dafo):
    """
    Genera gráfico de barras con los totales DAFO.
    
    Args:
        resultados_dafo: dict con 'fo', 'fa', 'do', 'da'
    
    Returns:
        str: Imagen en base64
    """
    categorias = ['FO\n(Fortalezas ×\nOportunidades)', 
                  'FA\n(Fortalezas ×\nAmenazas)',
                  'DO\n(Debilidades ×\nOportunidades)', 
                  'DA\n(Debilidades ×\nAmenazas)']
    
    valores = [
        resultados_dafo.get('fo', 0),
        resultados_dafo.get('fa', 0),
        resultados_dafo.get('do', 0),
        resultados_dafo.get('da', 0)
    ]
    
    colores = ['#27ae60', '#e74c3c', '#f39c12', '#9b59b6']
    
    fig, ax = plt.subplots(figsize=(10, 6))
    
    barras = ax.bar(categorias, valores, color=colores, edgecolor='white', linewidth=1.5)
    
    # Agregar valores en las barras
    for barra, valor in zip(barras, valores):
        height = barra.get_height()
        ax.text(barra.get_x() + barra.get_width()/2., height + 0.02,
                f'{valor:.2f}', ha='center', va='bottom', fontweight='bold', fontsize=11)
    
    # Configurar ejes
    ax.set_ylabel('Puntaje Total', fontsize=12)
    ax.set_title('Resultado del Análisis DAFO', fontsize=14, fontweight='bold')
    ax.set_ylim(0, max(valores) * 1.3 if valores else 1)
    
    # Agregar línea de referencia
    ax.axhline(y=np.mean(valores), color='gray', linestyle='--', alpha=0.5, label='Promedio')
    ax.legend()
    
    # Estilo
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.grid(axis='y', alpha=0.3)
    
    plt.tight_layout()
    
    # Convertir a base64
    buffer = BytesIO()
    plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight')
    plt.close(fig)
    buffer.seek(0)
    
    return base64.b64encode(buffer.getvalue()).decode('utf-8')


def crear_grafico_comparativo(efi_score, efe_score):
    """
    Genera gráfico comparativo EFI vs EFE.
    
    Args:
        efi_score: float - Puntaje EFI
        efe_score: float - Puntaje EFE
    
    Returns:
        str: Imagen en base64
    """
    categorias = ['EFI\n(Factores\nInternos)', 'EFE\n(Factores\nExternos)']
    valores = [efi_score, efe_score]
    colores = ['#3498db', '#e67e22']
    
    fig, ax = plt.subplots(figsize=(6, 5))
    
    barras = ax.bar(categorias, valores, color=colores, edgecolor='white', linewidth=2, width=0.5)
    
    # Agregar valores
    for barra, valor in zip(barras, valores):
        height = barra.get_height()
        ax.text(barra.get_x() + barra.get_width()/2., height + 0.05,
                f'{valor:.2f}', ha='center', va='bottom', fontweight='bold', fontsize=14)
    
    # Línea de referencia en 2.5
    ax.axhline(y=2.5, color='red', linestyle='--', alpha=0.7, label='Referencia (2.5)')
    
    ax.set_ylabel('Puntaje', fontsize=12)
    ax.set_title('Comparativo EFI vs EFE', fontsize=14, fontweight='bold')
    ax.set_ylim(0, max(valores) * 1.4 if valores else 4)
    ax.legend()
    
    # Estilo
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    
    plt.tight_layout()
    
    # Convertir a base64
    buffer = BytesIO()
    plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight')
    plt.close(fig)
    buffer.seek(0)
    
    return base64.b64encode(buffer.getvalue()).decode('utf-8')


def generar_todos_los_graficos(datos_completos):
    """
    Genera todos los gráficos y retorna como diccionario de base64.
    
    Args:
        datos_completos: dict con toda la información del análisis
    
    Returns:
        dict: {'radar': base64, 'barras': base64, 'comparativo': base64}
    """
    graficos = {}
    
    # Gráfico de radar
    radar_b64 = crear_grafico_radar({
        'fortalezas': datos_completos.get('fortalezas', []),
        'debilidades': datos_completos.get('debilidades', []),
        'oportunidades': datos_completos.get('oportunidades', []),
        'amenazas': datos_completos.get('amenazas', [])
    })
    if radar_b64:
        graficos['radar'] = radar_b64
    
    # Gráfico de barras DAFO
    barras_b64 = crear_grafico_barras(datos_completos.get('dafo', {}))
    if barras_b64:
        graficos['barras'] = barras_b64
    
    # Gráfico comparativo EFI/EFE
    comparativo_b64 = crear_grafico_comparativo(
        datos_completos.get('efi_score', 0),
        datos_completos.get('efe_score', 0)
    )
    if comparativo_b64:
        graficos['comparativo'] = comparativo_b64
    
    return graficos


if __name__ == '__main__':
    # Prueba rápida
    datos_prueba = {
        'fortalezas': [
            {'nombre': 'Voluntad alta dirección', 'puntaje': 0.48},
            {'nombre': 'Marco legal', 'puntaje': 0.30},
        ],
        'debilidades': [
            {'nombre': 'Procesos burocráticos', 'puntaje': 0.30},
            {'nombre': 'Fluctuación cuadros', 'puntaje': 0.30},
        ],
        'oportunidades': [
            {'nombre': 'Transformación digital', 'puntaje': 0.33},
            {'nombre': 'Modernización sector', 'puntaje': 0.30},
        ],
        'amenazas': [
            {'nombre': 'Bloqueo EE.UU.', 'puntaje': 0.30},
            {'nombre': 'Situación económica', 'puntaje': 0.24},
        ],
        'dafo': {'fo': 2.45, 'fa': 1.87, 'do': 1.23, 'da': 0.98},
        'efi_score': 2.85,
        'efe_score': 2.15
    }
    
    graficos = generar_todos_los_graficos(datos_prueba)
    print(f"Gráficos generados: {list(graficos.keys())}")
    for nombre, b64 in graficos.items():
        print(f"  {nombre}: {len(b64)} caracteres base64")
