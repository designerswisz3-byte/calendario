/**
 * Confere as invariantes do gerador de stories.
 *
 * ----------------------------------------------------------------------------
 * Por que isto existe
 * ----------------------------------------------------------------------------
 * O gerador é um banco de dados escrito à mão: vinte e nove temas, vinte e
 * nove arcos, trinta e três movimentos e vinte e quatro dispositivos, todos
 * cruzados. O compilador garante que os TIPOS casam e não garante nada do que
 * importa: que a sugestão de arco de um tema aponte para um arco que existe,
 * que o tema sustente o arco que ele sugere, que nenhuma sequência automática
 * saia com lacuna, que dois stories seguidos não repitam a mesma frase.
 *
 * Esta conferência pegou catorze defeitos reais na primeira vez que rodou —
 * entre eles cinco temas apontando para um arco que havia sido renomeado, cuja
 * sugestão simplesmente não era usada, sem nenhum aviso em lugar nenhum. É
 * exatamente o tipo de defeito que só aparece quando alguém percebe que a
 * sugestão do app nunca é a mesma que o tema pediu.
 *
 * Rode com `npm run conferir:stories` depois de mexer em temas.ts,
 * gatilhos.ts, dispositivos.ts ou gerador.ts.
 */
import { ARCOS, GATILHOS, contarAEI } from '@/lib/stories/gatilhos'
import { DISPOSITIVOS, exigeEsforco, LIMITE_DE_PEDIDOS } from '@/lib/stories/dispositivos'
import { TEMAS } from '@/lib/stories/temas'
import { arcoPadrao, arcosPossiveis, gerarSequencia, sugerirTemas } from '@/lib/stories/gerador'

let falhas = 0
const falhou = (msg: string) => {
  falhas++
  console.log('  ✗ ' + msg)
}

/* -- 1. as sugestões do dia ------------------------------------------------ */
/*
 * Três coisas de uma vez, porque as três são a mesma regra vista de ângulos
 * diferentes: a lista do dia tem três assuntos distintos, sempre com pelo
 * menos um que dá para falar de gente, e nunca com a lista inteira tomada por
 * eles.
 */
{
  let semConexao = 0
  const CONECTAM = ['contexto', 'humanidade']
  for (let d = 0; d < 120; d++) {
    const dia = new Date(Date.UTC(2026, 0, 1 + d)).toISOString().slice(0, 10)
    for (let giro = 0; giro < 3; giro++) {
      const sugestoes = sugerirTemas(
        dia,
        { eventos: ['Black Friday'], noticias: ['comissão de marketplace'] },
        3,
        giro,
      )
      const ids = sugestoes.map((s) => s.tema.id)
      if (sugestoes.length !== 3) falhou(`${sugestoes.length} sugestões em ${dia} giro ${giro}`)
      if (new Set(ids).size !== ids.length) falhou(`tema repetido em ${dia} giro ${giro}: ${ids}`)

      const conectam = sugestoes.filter((s) => CONECTAM.includes(s.tema.eixo))
      if (conectam.length === 0) semConexao++
      // Garantia é piso, não cota: dois de três assuntos do mesmo eixo de
      // conexão deixaria o dia sem assunto de operação.
      if (conectam.length > 2) falhou(`${conectam.length} temas de conexão em ${dia}/${giro}`)
    }
  }
  console.log(`1. sugestões do dia: ${semConexao} de 360 listas sem tema de conexão`)
  if (semConexao > 0) falhou('houve lista sem nenhum tema de conexão')
}

/* -- 2. o caminho automático não pode produzir rascunho quebrado ----------- */
/*
 * Quando a pessoa escolhe o arco na mão, lacuna é de propósito: o `[preencha:]`
 * avisa que falta um dado que só ela tem. Quando o APP escolhe, lacuna é
 * defeito — a sugestão tem de sair pronta para gravar, senão a pessoa aprende
 * a desconfiar da sugestão.
 */
{
  const fecho = (texto: string) => texto.split('\n\n').pop()!.trim()
  for (const tema of TEMAS) {
    for (let semente = 0; semente < 60; semente++) {
      const seq = gerarSequencia(tema.id, arcoPadrao(tema, semente), { semente })!
      seq.stories.forEach((story, i) => {
        if (story.texto.includes('[preencha:')) {
          falhou(`lacuna automática: ${tema.id}/${seq.arcoId}/${story.rotulo}`)
        }
        if (i === 0) return
        const anterior = seq.stories[i - 1]
        if (fecho(story.texto) === fecho(anterior.texto)) {
          falhou(`fecho repetido: ${tema.id}/${seq.arcoId} story ${i + 1}`)
        }
        // Campo longo citado em duas telas seguidas lê-se como repost.
        if (
          tema.dadoQueProva.length >= 30 &&
          story.texto.includes(tema.dadoQueProva) &&
          anterior.texto.includes(tema.dadoQueProva)
        ) {
          falhou(`dado repetido: ${tema.id}/${seq.arcoId} story ${i + 1}`)
        }
      })
    }
  }
  console.log(`2. caminho automático: ${TEMAS.length} temas × 60 sementes`)
}

/* -- 3. o orçamento de pedidos --------------------------------------------- */
/*
 * Sequência que pede algo em todo story para de parecer conteúdo e passa a
 * parecer captação — e o pedido seguinte deixa de ser atendido.
 */
{
  for (const arco of ARCOS) {
    const tema = TEMAS.find((t) => arcosPossiveis(t).some((a) => a.id === arco.id))
    if (!tema) {
      falhou(`nenhum tema sustenta o arco ${arco.id} — ele é inalcançável`)
      continue
    }
    const seq = gerarSequencia(tema.id, arco.id, { semente: 3 })!
    const comPedido = seq.stories.filter((s) => s.dispositivo !== 'nenhum')
    if (comPedido.length > LIMITE_DE_PEDIDOS) {
      falhou(`${arco.id}: ${comPedido.length} pedidos (limite ${LIMITE_DE_PEDIDOS})`)
    }
    const pesados = comPedido.filter((s) => exigeEsforco(s.dispositivo))
    if (pesados.length > 1) falhou(`${arco.id}: ${pesados.length} pedidos que custam trabalho`)
    for (const story of seq.stories) {
      if (story.dispositivo !== 'nenhum' && !DISPOSITIVOS[story.dispositivo]) {
        falhou(`${arco.id}: dispositivo desconhecido "${story.dispositivo}"`)
      }
    }
  }
  console.log(`3. orçamento de pedidos: ${ARCOS.length} arcos`)
}

/* -- 4. a tríade ----------------------------------------------------------- */
{
  for (const arco of ARCOS) {
    const conta = contarAEI(arco.passos)
    const soma = conta.autoridade + conta.entretenimento + conta.informacao
    if (soma !== arco.passos.length) falhou(`${arco.id}: tríade soma ${soma}, mas o arco tem ${arco.passos.length} passos`)
  }
  const diaCompleto = contarAEI(ARCOS.find((a) => a.id === 'dia_completo')!.passos)
  if (Object.values(diaCompleto).some((n) => n === 0)) {
    falhou('dia_completo não cobre as três pontas da tríade')
  }
  console.log('4. tríade A.E.I: conta fecha em todos os arcos')
}

/* -- 5. o arco padrão do texto livre serve a todos os temas ---------------- */
/*
 * O estado inicial do seletor de texto livre é um arco fixo, e quem digita um
 * assunto não escolheu arco nenhum. Se esse arco exigir um campo que parte dos
 * temas não tem, o padrão do app produz rascunho com lacuna.
 */
{
  const PADRAO = 'reflexao_dura'
  for (const tema of TEMAS) {
    if (!arcosPossiveis(tema).some((a) => a.id === PADRAO)) {
      falhou(`${tema.id} não sustenta o arco padrão ${PADRAO}`)
    }
  }
  console.log(`5. arco padrão (${PADRAO}): sustentado por todos os ${TEMAS.length} temas`)
}

/* -- 6. as sugestões de arco de cada tema ---------------------------------- */
/*
 * A conferência que pegou mais defeito: cinco temas apontavam para um arco
 * renomeado, e nove para arcos que o próprio tema não sustentava.
 */
{
  const ids = new Set(ARCOS.map((a) => a.id))
  for (const tema of TEMAS) {
    for (const sugerido of tema.arcosSugeridos) {
      if (!ids.has(sugerido)) falhou(`${tema.id}: arco inexistente "${sugerido}"`)
      else if (!arcosPossiveis(tema).some((a) => a.id === sugerido)) {
        falhou(`${tema.id}: sugere "${sugerido}" mas não sustenta`)
      }
    }
  }
  console.log('6. arcosSugeridos: todos existem e são sustentáveis')
}

/* -- 7. variedade e alcance ------------------------------------------------ */
/*
 * Os números que explicam por que o gerador antigo parecia padronizado: dez de
 * dezesseis arcos abriam no mesmo movimento e onze fechavam no mesmo. A régua
 * aqui é frouxa de propósito — ela não persegue um número, só impede a volta
 * ao conjunto de aberturas e fechos quase único.
 */
{
  const aberturas = new Set(ARCOS.map((a) => a.passos[0]))
  const fechos = new Set(ARCOS.map((a) => a.passos[a.passos.length - 1]))
  console.log(
    `7. variedade: ${aberturas.size} aberturas e ${fechos.size} fechos distintos em ${ARCOS.length} arcos`,
  )
  if (aberturas.size < 8) falhou(`só ${aberturas.size} aberturas distintas`)
  if (fechos.size < 4) falhou(`só ${fechos.size} fechos distintos`)

  const usados = new Set(ARCOS.flatMap((a) => a.passos))
  const orfaos = Object.keys(GATILHOS).filter((g) => !usados.has(g as never))
  if (orfaos.length > 0) falhou(`movimentos que nenhum arco usa: ${orfaos.join(', ')}`)

  const comCostura = ARCOS.filter((arco) => {
    const tema = TEMAS.find((t) => arcosPossiveis(t).some((a) => a.id === arco.id))
    if (!tema) return false
    return gerarSequencia(tema.id, arco.id, { semente: 1 })!.stories.some((s) => s.retomada)
  }).length
  console.log(`   ${comCostura} de ${ARCOS.length} arcos amarram um story no anterior`)

  const cobertura = TEMAS.map((t) => arcosPossiveis(t).length)
  console.log(
    `   cada tema sustenta de ${Math.min(...cobertura)} a ${Math.max(...cobertura)} dos ${ARCOS.length} arcos`,
  )
}

console.log(falhas === 0 ? '\n✓ todas as invariantes passaram' : `\n✗ ${falhas} falhas`)
process.exit(falhas === 0 ? 0 : 1)
