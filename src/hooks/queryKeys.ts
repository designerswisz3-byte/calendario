export const queryKeys = {
  calendarItems: (monthKey: string) => ['calendar-items', monthKey] as const,
  // Mesmo prefixo das queries de mês de propósito: um invalidate em
  // ['calendar-items'] atualiza a grade e a gaveta na mesma tacada, e os dois
  // mudam sempre juntos (o item sai de um e entra no outro).
  gavetaDoCalendario: () => ['calendar-items', 'gaveta'] as const,
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
  eventos: (de: string, ate: string) => ['eventos', de, ate] as const,
  storiesDoMes: (de: string, ate: string) => ['stories', de, ate] as const,
  gavetaDeStories: () => ['stories', 'gaveta'] as const,
  noticias: () => ['noticias'] as const,
  relatorioPerfis: () => ['relatorio', 'perfis'] as const,
  relatorioMetricas: (perfilId: string) => ['relatorio', 'metricas', perfilId] as const,
  relatorioPublicacoes: (perfilId: string) =>
    ['relatorio', 'publicacoes', perfilId] as const,
  publicacoesAgendadas: () => ['publicacoes-agendadas'] as const,
}
