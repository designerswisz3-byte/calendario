import * as React from 'react'
import { createPortal } from 'react-dom'
import {
  METRICAS_DE_FLUXO,
  ROTULOS,
  comSinal,
  numero,
  percentual,
  type Comparativo,
  type Granularidade,
  type Periodo,
} from '@/lib/relatorio'

export interface RelatorioParaImprimir {
  perfil: string
  granularidade: Granularidade
  periodos: Periodo[]
  comparativo: Comparativo
}

interface Props {
  relatorio: RelatorioParaImprimir | null
  onConcluido: () => void
}

/** As mesmas colunas da tabela da tela, na mesma ordem. */
const COLUNAS = [
  'alcance',
  'views',
  'interacoes',
  'likes',
  'comentarios',
  'salvamentos',
  'compartilhamentos',
  'cliques_no_link',
  'publicacoes',
] as const satisfies readonly (typeof METRICAS_DE_FLUXO)[number][]

const DESTAQUES = ['alcance', 'views', 'interacoes', 'salvamentos', 'compartilhamentos'] as const

/**
 * Exporta o dashboard em PDF pelo motor de impressão do navegador — o mesmo
 * caminho da nota, pelo mesmo motivo: o PDF sai com texto selecionável e
 * paginação de verdade, sem custar dependência nenhuma.
 *
 * O que vai para o papel é O DADO, não a tela: tabela e números em vez das
 * barras. Um gráfico de barras impresso em A4 preto e branco é decoração; a
 * tabela é o que alguém relê em reunião. A cobertura de cada período vai junto
 * em cada linha, para o PDF não circular por aí sugerindo uma queda que foi
 * falta de coleta.
 */
export function ImpressaoDoRelatorio({ relatorio, onConcluido }: Props) {
  React.useEffect(() => {
    if (!relatorio) return
    let cancelado = false
    // Um quadro para o layout assentar antes de abrir o diálogo.
    const id = requestAnimationFrame(() => {
      if (cancelado) return
      window.print()
      onConcluido()
    })
    return () => {
      cancelado = true
      cancelAnimationFrame(id)
    }
  }, [relatorio, onConcluido])

  if (!relatorio) return null

  const { perfil, granularidade, periodos, comparativo } = relatorio
  const { atual, anterior } = comparativo
  const maisRecentePrimeiro = [...periodos].reverse()
  const incompletos = periodos.filter((p) => p.diasComDado < p.diasNoPeriodo)

  const ganho = comparativo.seguidoresGanhos

  return createPortal(
    <div className="area-de-impressao impressao-do-relatorio" aria-hidden>
      <h1>Relatório — @{perfil}</h1>
      <p className="relatorio-subtitulo">
        {granularidade === 'mensal' ? 'Visão mensal' : 'Visão semanal'} · período em foco:{' '}
        {atual.rotulo} ({atual.inicio} a {atual.fim}) · {atual.diasComDado} de{' '}
        {atual.diasNoPeriodo} dias com dado · gerado em{' '}
        {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
      </p>

      <h2>
        {atual.rotulo}
        {anterior ? ` vs ${anterior.rotulo}` : ' (primeiro período da série)'}
      </h2>

      <dl className="relatorio-cartoes">
        <div className="relatorio-cartao">
          <dt>Seguidores (fim do período)</dt>
          <dd>
            {numero(atual.seguidoresFim)}
            <div className="relatorio-delta">
              Ganho {comSinal(ganho.atual)}
              {ganho.anterior !== null && ` · anterior ${comSinal(ganho.anterior)}`}
            </div>
          </dd>
        </div>

        {DESTAQUES.map((metrica) => {
          const v = comparativo.fluxos[metrica]
          return (
            <div className="relatorio-cartao" key={metrica}>
              <dt>{ROTULOS[metrica]}</dt>
              <dd>
                {numero(v.atual)}
                <div className="relatorio-delta">
                  {v.diferenca === null
                    ? v.atual === null
                      ? 'sem dado neste período'
                      : anterior
                        ? 'sem dado no período anterior'
                        : 'sem período anterior'
                    : `${v.percentual === null ? comSinal(v.diferenca) : percentual(v.percentual)}${
                        v.percentual !== null ? ` (${comSinal(v.diferenca)})` : ''
                      }${v.comparavel ? '' : ' — cobertura desigual'}`}
                </div>
              </dd>
            </div>
          )
        })}
      </dl>

      {anterior && !comparativo.fluxos.alcance.comparavel && (
        <p className="relatorio-aviso">
          <strong>Atenção:</strong> {atual.rotulo} tem {atual.diasComDado} dias com dado e{' '}
          {anterior.rotulo} tem {anterior.diasComDado}. A variação percentual acima mistura
          performance com falta de coleta — leia os números absolutos junto da coluna de dias.
        </p>
      )}

      <h2>Arquivo {granularidade === 'mensal' ? 'mês a mês' : 'semana a semana'}</h2>
      <table>
        <thead>
          <tr>
            <th>Período</th>
            <th>Dias</th>
            <th>Seguidores</th>
            <th>Ganho</th>
            {COLUNAS.map((coluna) => (
              <th key={coluna}>{ROTULOS[coluna]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {maisRecentePrimeiro.map((periodo) => {
            const ganhoDoPeriodo =
              periodo.seguidoresInicio !== null && periodo.seguidoresFim !== null
                ? periodo.seguidoresFim - periodo.seguidoresInicio
                : periodo.fluxos.seguidores_ganhos
            return (
              <tr key={periodo.chave}>
                <td>{periodo.rotulo}</td>
                <td>
                  {periodo.diasComDado}/{periodo.diasNoPeriodo}
                </td>
                <td>{numero(periodo.seguidoresFim)}</td>
                <td>{ganhoDoPeriodo === null ? '—' : comSinal(ganhoDoPeriodo)}</td>
                {COLUNAS.map((coluna) => (
                  <td key={coluna}>{numero(periodo.fluxos[coluna])}</td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>

      <p className="relatorio-rodape">
        "—" significa dia sem coleta, não zero: nenhum valor deste relatório foi estimado ou
        interpolado.
        {incompletos.length > 0 &&
          ` ${incompletos.length} período(s) estão incompletos: ${incompletos
            .map((p) => `${p.rotulo} (${p.diasComDado}/${p.diasNoPeriodo})`)
            .join(', ')}.`}
      </p>
    </div>,
    document.body,
  )
}
