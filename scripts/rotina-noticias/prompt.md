Coleta de notícias para o Raphael (dono de e-commerce de moda feminina, marca Swisz; ensina margem, operação, canal e precificação para outros donos de e-commerce de moda).

Destino: a aba "Notícias" do app dele, que lê a tabela `noticias` no Supabase.

**Esta sessão não tem o repositório clonado.** Não procure por `scripts/importar.mjs`.

## 0. Credenciais e modo da corrida

```bash
export URL="https://szzmhewaybhkrsqjhygr.supabase.co"
export ANON="COLE_A_CHAVE_ANON"
export TOKEN="COLE_O_TOKEN_DE_INGESTAO"

export HORA=$(TZ=America/Sao_Paulo date +%H)
[ "$HORA" -lt 9 ] && export MODO=varredura || export MODO=ronda
echo "modo: $MODO (${HORA}h em Brasília)"

curl -s -o /dev/null -w 'porta: HTTP %{http_code}\n' -X POST "$URL/rest/v1/rpc/urls_de_noticias" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN\",\"dias\":1}"
```

`HTTP 200` = **modo publicação**: você grava direto, pelo item 4.

Qualquer outra coisa = **modo entrega**: você termina com o JSON pronto num bloco de código, e ele cola em Notícias → Importar coleta. Diga numa linha qual foi o código HTTP. Não peça credencial a ninguém e não tente contornar.

## 1. O que já está guardado — leia ANTES de qualquer coisa

```bash
curl -s -X POST "$URL/rest/v1/rpc/urls_de_noticias" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN\",\"dias\":10}"
```

Guarde essa lista. **É ela que define o que é "novo"** — e não a sua noção de quantas horas se passaram. O que não está nessa lista é novo; o que está, não volta. A mesma história num link diferente também conta como repetida.

## 2. Pesquisa: ABRA AS REDAÇÕES, não pesquise por elas

**Esta é a regra que mais importa, e ela existe por um motivo medido:** às 9h54 de 23/10/2026 a busca na web respondeu "não encontrei notícias de 23 de outubro; as mais recentes são de 22". No mesmo minuto, a página de últimas do Mercado&Consumo tinha **cinco** matérias daquele dia. O índice de busca atrasa horas; a página da redação, não. Pesquisar por notícia de hoje devolve a de ontem — foi exatamente isso que fez a aba parecer sempre atrasada.

Então: **use WebFetch nas páginas de últimas abaixo.** Busca na web é complemento, para confirmar um fato ou achar a fonte primária de algo que você viu na listagem — nunca o caminho principal.

**Na varredura** (manhã), abra pelo menos 5 destas. **Na ronda**, abra pelo menos 3, começando pelas de moda e e-commerce:

- https://mercadoeconsumo.com.br/category/ecommerce/
- https://www.ecommercebrasil.com.br/noticias
- https://mercadoeconsumo.com.br/category/economia/
- https://www.infomoney.com.br/economia/
- https://exame.com/negocios/
- https://www.gov.br/receitafederal/pt-br/assuntos/noticias
- https://www12.senado.leg.br/noticias/ultimas
- https://www.modernretail.co/
- https://www.retaildive.com/

Peça a cada página os títulos, as datas e os links das últimas matérias. Depois compare com a lista do item 1 e fique só com o que não está lá. **Abrir a matéria inteira só vale a pena para o que você vai publicar** — o título e a linha fina da listagem já dizem se entra.

### As quatro frentes

**a) Moda e e-commerce.** É o núcleo. Regra de marketplace (comissão, taxa fixa, frete, devolução, vitrine); tributação e importação (taxa das blusinhas, de minimis lá fora); concorrência (Shein, Shopee, Temu, Mercado Livre, Amazon, varejistas nacionais); logística e prazo; comportamento de compra, devolução e conversão em moda.
Ignore: lançamento de coleção, celebridade, desfile, moda como editorial, release de assessoria sem fato novo.

**b) Economia.** Só o que mexe na conta de quem vende moda: Selic e crédito, câmbio, inflação, massa salarial, varejo restrito, inadimplência, frete e combustível.
Ignore: previsão de analista sem dado novo, "mercado reage", cotação do dia. Boletim Focus só quando a projeção MUDA de forma relevante — não toda segunda.

**c) Política.** Filtro duro, e o filtro é um só: **isso muda uma conta da operação dele?**
Entra: reforma tributária (CBS, IBS, transição), ICMS e Difal, tributação de importados, mudança trabalhista, acordo comercial, MP ou decreto que altere imposto ou obrigação acessória.
**Não entra, nunca**: debate eleitoral, disputa entre candidatos ou partidos, declaração polêmica, pesquisa de intenção de voto, qualquer coisa que o coloque num lado.
Isto já foi quebrado uma vez: entrou uma matéria sobre um debate entre candidatos na TV. **Se o título tem nome de político e não tem nome de tributo, não entra.** Ele é dono de operação que precisa saber o que muda na conta, não comentarista político — conteúdo partidário no perfil dele custa audiência e não traz nenhuma.

**d) Empreendedorismo.** Gestão, pessoas, processo e decisão de dono de PME, com caso real e número.
Não entra: frase de efeito, "mentalidade", ranking de influenciador, entrevista motivacional sem fato.

### Quanto publicar

| | Quando | Quanto |
| --- | --- | --- |
| **varredura** | primeira corrida do dia | 5 a 9 itens |
| **ronda** | as demais | o que for novo, até 4 |

**A ronda publica com a MESMA régua da varredura.** Ela não é uma conferida de alto nível: é a mesma coleta, feita sobre o que a redação publicou desde a última vez. Se saíram três matérias boas às 11h, as três entram ao meio-dia — não no dia seguinte.

**Nenhuma das duas inventa item para justificar a corrida.** Ronda com zero itens novos é normal e é uma resposta boa. A diferença entre "não achei nada" e "enchi a lista" é a aba continuar sendo lida.

## 3. Curadoria — é isto que é o produto

Régua de `relevancia`:
- 5 = muda uma decisão desta semana (preço, canal, compra, prazo, caixa)
- 4 = mexe no plano do trimestre
- 3 = vale saber, não muda nada agora
- 1 e 2 **não entram**

Cada item precisa de `por_que_importa`: 1 a 3 frases sobre o que aquilo muda na operação de quem vende moda — margem, mix, canal, prazo, devolução, caixa. Não é o resumo de novo. Se você não consegue escrever essa frase, a notícia não entra. Para economia e política essa frase é ainda mais obrigatória: é ela que justifica a notícia estar num painel de e-commerce.

Regras que não se quebram:
- URL real para toda notícia. Sem URL, fora.
- **`publicado_em` com a data que a listagem mostrou.** Ela existe quase sempre e é o que ordena a aba — sem ela a notícia afunda no fim da lista mesmo sendo de hoje. Só use `null` quando a página realmente não datar. Nunca chute.
- Não invente número, declaração nem valor. Se a fonte é blog de agência e não veículo, diga isso no `resumo`.
- Não repita o mesmo fato de dois veículos. Fique com a fonte primária ou com a mais completa.

## 4. O JSON e a gravação

**A primeira etiqueta de `tags` é a editoria**, exatamente uma destas: `moda`, `economia`, `politica`, `empreendedorismo` (sem acento). Depois dela, 1 a 3 etiquetas livres. **Todo objeto precisa ter exatamente as mesmas chaves**, com `null` onde não houver valor.

```json
[
  {
    "titulo": "...",
    "resumo": "1 a 3 frases com o fato",
    "por_que_importa": "o que isso muda na operação dele",
    "url": "https://...",
    "fonte": "Nome do veículo",
    "publicado_em": "2026-10-23",
    "relevancia": 4,
    "tags": ["moda", "marketplace"]
  }
]
```

Em modo publicação, escreva a lista em `/tmp/coleta.json` e rode:

```bash
python3 - <<'PY'
import json, os
linhas = json.load(open('/tmp/coleta.json'))
json.dump({'token': os.environ['TOKEN'], 'linhas': linhas}, open('/tmp/envio.json', 'w'))
print(len(linhas), 'linha(s)')
PY

curl -s -w '\nHTTP %{http_code}\n' -X POST "$URL/rest/v1/rpc/ingerir_noticias" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" -H "Content-Type: application/json" \
  --data @/tmp/envio.json
```

A resposta é o número de linhas gravadas. `HTTP 200` com um número = gravou. Qualquer outra coisa = não gravou; diga isso em vez de reportar sucesso. `HTTP 403 token de ingestão inválido` significa que o token foi regerado no Supabase e esta rotina está com o antigo — avise, não tente contornar.

Com zero itens, **não chame esta etapa**: não há o que gravar.

## 5. Só na varredura de segunda: datas novas de feira

Veja se alguma organizadora publicou calendário novo — Couromoda, Francal, SPFW, Fenin, Minas Trend, NRF, Shoptalk, Première Vision, MAGIC. **Só conta data publicada pela própria organizadora**; data inventada faz alguém comprar passagem errada.

Em modo publicação, grave com `rpc/ingerir_eventos` (mesma mecânica do item 4), com as chaves: `data`, `data_fim`, `titulo`, `categoria` ("setorial"), `escopo`, `local`, `por_que_importa`, `ideia_de_post`, `fonte_url`. Em modo entrega, reporte em texto, antes do bloco de JSON:

```
DATA NOVA: Couromoda 2027 — 11 a 13/01/2027, Expo Center Norte, São Paulo
Fonte: https://couromoda.com/...
```

## 6. Como terminar

**Ronda sem nada novo é UMA linha e nada mais:**

```
Nada novo nas redações desde a última coleta.
```

Sem preâmbulo, sem lista do que você abriu, sem JSON.

**Com itens**, nesta ordem exata:

1. **Uma linha** com o destaque: qual notícia importa mais e por quê.
2. **Uma linha** com a contagem por frente — "6 notícias — 4 moda, 1 economia, 1 política" — e, em seguida, "publicadas" ou "colar em Notícias → Importar coleta".
3. A linha `DATA NOVA:`, se houver.
4. Em modo entrega, o **JSON inteiro num único bloco de código**, como a última coisa da mensagem. Em modo publicação, não mande JSON nenhum.

Se algo falhar, diga **a linha do erro** e não tente contornar — nem com dado inventado, nem com outra fonte. Um erro visível custa uma coleta; um dado inventado custa a confiança no painel inteiro.
