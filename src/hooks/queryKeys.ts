export const queryKeys = {
  calendarItems: (monthKey: string) => ['calendar-items', monthKey] as const,
  calendarItem: (id: string) => ['calendar-item', id] as const,
  preview: (id: string) => ['content-preview', id] as const,
  previewByCalendarItem: (calendarItemId: string) =>
    ['content-preview', 'by-calendar-item', calendarItemId] as const,
  ajustes: (previewId: string) => ['ajustes', previewId] as const,
  tags: () => ['tags'] as const,
  canvas: (nome: string) => ['canvas', nome] as const,
  notas: () => ['notas'] as const,
  nota: (id: string) => ['nota', id] as const,
  notasLigacoes: () => ['notas', 'ligacoes'] as const,
}
