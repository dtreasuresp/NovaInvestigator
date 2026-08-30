import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  Packer,
  Header,
  Footer,
  PageNumber
} from 'docx'
import type { UnifiedResearchReportData } from './report-model'

export async function renderDocxReport(data: UnifiedResearchReportData): Promise<Buffer> {
  const isFull = data.reportType === 'full'

  const children = [
    // Encabezado Principal
    new Paragraph({
      text: 'NovaResearch — Informe Estratégico Ejecutivo',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: data.organization, bold: true, size: 28 }),
        new TextRun({ text: ` — ${data.title}`, size: 28 })
      ],
      spacing: { after: 400 }
    }),

    // Metadatos de la Investigación
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Expediente:', bold: true })] })]
            }),
            new TableCell({
              children: [new Paragraph(data.investigationId)]
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Fecha:', bold: true })] })]
            }),
            new TableCell({
              children: [new Paragraph(new Date(data.date).toLocaleDateString('es-ES'))]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Autor / Responsable:', bold: true })] })]
            }),
            new TableCell({
              children: [new Paragraph(data.author)]
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Estado:', bold: true })] })]
            }),
            new TableCell({
              children: [new Paragraph(data.status)]
            })
          ]
        })
      ]
    }),

    new Paragraph({ text: '', spacing: { after: 300 } }),

    // 1. Diagnóstico y Posición Estratégica
    new Paragraph({
      text: '1. Diagnóstico y Posición Estratégica Cuantitativa',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 150 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `La evaluación cuantitativa ponderada sitúa la orientación de la organización en el cuadrante: `,
          size: 22
        }),
        new TextRun({ text: data.strategicOrientation, bold: true, size: 22 }),
        new TextRun({
          text: `. Con una puntuación interna (EFI) de ${data.strategicPositionScore.internalEfi.toFixed(2)} y una puntuación externa (EFE) de ${data.strategicPositionScore.externalEfe.toFixed(2)}.`,
          size: 22
        })
      ],
      spacing: { after: 250 }
    }),

    // 2. Factores Clave (EFI / EFE)
    new Paragraph({
      text: '2. Matriz de Factores Clave (EFI / EFE)',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 150 }
    }),

    createFactorsTable('Fortalezas (Internas)', data.factors.strengths),
    new Paragraph({ text: '', spacing: { after: 150 } }),
    createFactorsTable('Debilidades (Internas)', data.factors.weaknesses),
    new Paragraph({ text: '', spacing: { after: 150 } }),
    createFactorsTable('Oportunidades (Externas)', data.factors.opportunities),
    new Paragraph({ text: '', spacing: { after: 150 } }),
    createFactorsTable('Amenazas (Externas)', data.factors.threats),

    // 3. Plan de Acción CAME
    new Paragraph({
      text: '3. Plan de Acción CAME (Corregir, Afrontar, Mantener, Explotar)',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 150 }
    }),
    createCameTable(data.cameActions)
  ]

  // Si es Full Report, agregamos Sección de Proyectos y Actividades Kanban
  if (isFull && data.projects.length > 0) {
    children.push(
      new Paragraph({
        text: '4. Proyectos de Implementación y Gobernanza Operativa',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 150 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Se han configurado ${data.projects.length} proyecto(s) de ejecución con un presupuesto total de $${data.budgetSummary.totalBudget.toLocaleString()} y un avance global del ${data.budgetSummary.executionRate}%.`,
            size: 22
          })
        ],
        spacing: { after: 250 }
      })
    )

    for (const proj of data.projects) {
      children.push(
        new Paragraph({
          text: `Proyecto: ${proj.name} [Prioridad: ${proj.priority.toUpperCase()}] [Estado: ${proj.status}]`,
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Objetivo: ', bold: true }),
            new TextRun({ text: proj.objective || proj.description || 'Sin descripción' }),
            new TextRun({ text: ' | Líder: ', bold: true }),
            new TextRun({ text: proj.leaderName || 'No asignado' }),
            new TextRun({ text: ' | Presupuesto: ', bold: true }),
            new TextRun({ text: `$${proj.budgetTotal.toLocaleString()} (${proj.budgetMode})` })
          ],
          spacing: { after: 150 }
        })
      )

      if (proj.tasks.length > 0) {
        children.push(createTasksTable(proj.tasks))
      }
      children.push(new Paragraph({ text: '', spacing: { after: 200 } }))
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                text: 'NovaResearch — DGTECNOVA SRL',
                alignment: AlignmentType.RIGHT
              })
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun('Página '),
                  new TextRun({ children: [PageNumber.CURRENT] }),
                  new TextRun(' de '),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES] })
                ]
              })
            ]
          })
        },
        children
      }
    ]
  })

  return await Packer.toBuffer(doc)
}

function createFactorsTable(
  title: string,
  factors: Array<{ name: string; weight: number; rating: number; score: number }>
): Table {
  const rows = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: title, bold: true })] })]
        }),
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: 'Peso', bold: true })] })]
        }),
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: 'Calif.', bold: true })] })]
        }),
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: 'Puntaje', bold: true })] })]
        })
      ]
    })
  ]

  if (factors.length === 0) {
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 4,
            children: [new Paragraph({ text: 'No se registraron factores en este rubro.', alignment: AlignmentType.CENTER })]
          })
        ]
      })
    )
  } else {
    factors.forEach(f => {
      rows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(f.name)] }),
            new TableCell({ children: [new Paragraph(f.weight.toFixed(2))] }),
            new TableCell({ children: [new Paragraph(f.rating.toFixed(1))] }),
            new TableCell({ children: [new Paragraph(f.score.toFixed(2))] })
          ]
        })
      )
    })
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows
  })
}

function createCameTable(
  actions: Array<{ id: string; type: string; action: string; responsible: string; status: string }>
): Table {
  const rows = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 12, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: 'Tipo', bold: true })] })]
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Acción Estratégica', bold: true })] })]
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: 'Responsable', bold: true })] })]
        }),
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: 'Estado', bold: true })] })]
        })
      ]
    })
  ]

  if (actions.length === 0) {
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 4,
            children: [new Paragraph({ text: 'No se han formulado acciones CAME.', alignment: AlignmentType.CENTER })]
          })
        ]
      })
    )
  } else {
    actions.forEach(a => {
      const typeLabel =
        a.type === 'C' ? 'Corregir' : a.type === 'A' ? 'Afrontar' : a.type === 'M' ? 'Mantener' : 'Explotar'

      rows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(`${a.id} (${typeLabel})`)] }),
            new TableCell({ children: [new Paragraph(a.action)] }),
            new TableCell({ children: [new Paragraph(a.responsible)] }),
            new TableCell({ children: [new Paragraph(a.status)] })
          ]
        })
      )
    })
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows
  })
}

function createTasksTable(
  tasks: Array<{ id: string; title: string; priority: string; status: string; budgetAmount: number }>
): Table {
  const rows = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Actividad Kanban', bold: true })] })]
        }),
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: 'Prioridad', bold: true })] })]
        }),
        new TableCell({
          width: { size: 18, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: 'Columna / Estado', bold: true })] })]
        }),
        new TableCell({
          width: { size: 18, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: 'Presupuesto', bold: true })] })]
        })
      ]
    })
  ]

  tasks.forEach(t => {
    rows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(t.title)] }),
          new TableCell({ children: [new Paragraph(t.priority)] }),
          new TableCell({ children: [new Paragraph(t.status)] }),
          new TableCell({ children: [new Paragraph(`$${t.budgetAmount.toLocaleString()}`)] })
        ]
      })
    )
  })

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows
  })
}
