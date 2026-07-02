---
name: dossie-diagnostico-rv
description: Monta o Dossiê Diagnóstico da paciente no Método RV (Dra. Roselma Vilanova) — o documento estrutural de "Engenharia da Face · Estrutura antes da estética" que registra queixa, análise por terços faciais, pescoço, exames (ultrassom cervical), diagnóstico, plano cirúrgico e segurança. Use SEMPRE que a Dra. Roselma mencionar "dossiê", "dossiê diagnóstico", "avaliação estrutural", "montar o documento da paciente", "diagnóstico da [nome]", ou colar/descrever achados de uma avaliação facial (terços, deep plane, deep neck, jowls, ângulo cervicomentual, medidas de ultrassom, microfat) — mesmo que não diga a palavra "dossiê" explicitamente. Gera a saída em Markdown pronta e, se pedido, versão HTML/PDF na identidade navy/dourado da marca.
---

# Dossiê Diagnóstico · Método RV

## Objetivo
Transformar as anotações de uma Avaliação Estrutural da Face (Método RV) em um **Dossiê Diagnóstico** completo, coerente e no tom da marca — um documento clínico e institucional, **não** uma proposta comercial. O dossiê registra o que a Dra. Roselma viu, o que a face da paciente pede, o que **não** precisa ser feito, o plano cirúrgico e a segurança do preparo.

## Quando usar
- Quando a Dra. Roselma quer montar o dossiê de uma nova paciente a partir das notas da avaliação.
- Quando ela cola achados soltos (queixa, terços, pescoço, medidas de ultrassom) e quer o documento formatado.
- Quando pede para adaptar/atualizar um dossiê existente.
- Quando pede a versão em PDF na identidade da marca para entregar à paciente.

## Princípio editorial central (não negociável)
O Método RV comunica **"Estrutura antes da estética"**. Todo o texto deve refletir:
1. **Diagnóstico, não venda.** É um retrato honesto da arquitetura da face. Nunca soa comercial nem agressivo.
2. **Estrutura, não superfície.** O problema costuma ser **descida das estruturas profundas** (não sobra de pele, não falta de volume). Injetáveis preenchem, não reposicionam.
3. **Honestidade que inclui o "não".** Sempre há a seção **"O que sua face NÃO pede"** — é o que constrói autoridade e confiança.
4. **Operar sabendo, não supondo.** Ultrassom pré-operatório e monitorização neural (NIM) são o diferencial de segurança.
5. **Feito para durar.** Reposicionamento pensado para atravessar a década, não para impressionar nos primeiros meses.

### Regras de integridade clínica
- **Nunca invente achados, medidas, diagnósticos ou exames.** Só preencha com o que a Dra. Roselma fornecer. Se um dado faltar, deixe o campo marcado como pendente ou pergunte — não preencha por conta própria.
- Mantenha as ressalvas de método: *"Achados da avaliação fotográfica — a confirmar no exame presencial"* onde couber.
- Respeite a LGPD e a Resolução CFM 2.336/2023: o documento é individualizado e sigiloso; não use dados de outra paciente como preenchimento.

## Voz e vocabulário
- Primeira pessoa da Dra. Roselma ("eu vejo", "eu recomendo", "eu prefiro operar uma vez, bem feito, para durar").
- Sofisticação silenciosa, calma, inteligência técnica. Sem sensacionalismo, sem promessa de transformação radical, sem estética de volume.
- Termos do método: reposicionamento profundo (deep plane), deep neck estruturado, terços faciais, coxim malar, jowls, ângulo cervicomentual, componente subplatismal, microfat/lipoenxertia, redrapejamento, denervação do prócero.

## Identidade visual da marca (para versões HTML/PDF)
- **Cores:** navy `#172334` (texto/títulos), dourado `#A3834F` (destaques/numeração), off-white `#F2EFEA` (fundo). Paralelo aceito: `#1B212D` / `#9E7D48` / `#F0EBDD`.
- **Tipografia:** Cormorant Garamond (display/títulos) + Montserrat (corpo/apoio).
- **Assinatura fixa (rodapé de encerramento):**
  Dra. Roselma Vilanova · Cirurgiã de Cabeça e Pescoço · CRM-MA 9212 · RQE 6565 · RQE 6566 · @draroselmavilanova
- **Marca d'água conceitual:** "ENGENHARIA DA FACE · MÉTODO RV" / "Estrutura antes da estética".

## Estrutura obrigatória do documento
Use SEMPRE a estrutura do template em `assets/template-dossie.md`. Leia esse arquivo antes de gerar e siga a ordem exata das seções:

1. **Capa** — Engenharia da Face · Método RV · nome da paciente · data
2. **Sobre este documento** (texto fixo)
3. **Sua história** — nome, idade, momento de vida, atividade física, queixa (nas palavras dela + o que a Dra. observa), procedimentos prévios
4. **Parte I — Análise Estrutural** — terço superior, médio, inferior, pescoço (tabelas "O QUE AVALIO / ACHADO")
5. **O seu mapa** — registro fotográfico padronizado + leitura estrutural resumida
6. **Exames** — ultrassom cervical (equipamento, planos, medidas, correlação cirúrgica) + pele
7. **Parte II — Diagnóstico** — síntese, o que pede, o que NÃO pede, diagnóstico final
8. **Plano cirúrgico** — tempos integrados
9. **Para durar** (longevidade, texto fixo) · **Como eu protejo você** (segurança) · **De onde seguimos** (próximos passos)
10. **Encerramento** com assinatura
11. **Anexos técnicos** — A1 prancha de ultrassom · A2 leitura fotográfica complementar

As colunas "O QUE AVALIO" das tabelas são fixas; preencha apenas os "ACHADO". Textos institucionais (Sobre este documento, Para durar, Como eu protejo você) são fixos — mantenha-os.

## Fluxo de trabalho
1. **Ler o template** `assets/template-dossie.md` para carregar a estrutura e as marcações `{{...}}`.
2. **Coletar os dados** da paciente (ver checklist abaixo). Se algo faltar e for essencial, pergunte de forma objetiva antes de escrever.
3. **Preencher** cada `{{CAMPO}}` com o dado correspondente, reescrevendo no tom da Dra. Roselma (não copie a nota crua — traduza para a voz do método).
4. **Aplicar blocos condicionais:** se não houver preenchimento prévio, apague as ressalvas "há produto na região"; se não houver etapa concluída, ajuste a lista de próximos passos; monte a tabela de tempos cirúrgicos só com o que foi indicado.
5. **Revisar a coerência:** a seção "O que NÃO pede" deve conversar com os achados; as medidas do ultrassom devem bater com o texto e com os anexos.
6. **Entregar** o `.md` final em `/mnt/user-data/outputs/` com nome `Dossie_[NomePaciente].md` e apresentar à Dra. Roselma.
7. **Se pedirem PDF/HTML**, renderize na identidade navy/dourado (Cormorant + Montserrat), preservando a estrutura e a assinatura fixa, e gere o arquivo para download.

## Checklist de entrada (o que a Dra. fornece)
- **Identificação:** nome completo, idade, momento de vida (ex.: climatério sem reposição), atividade física, data da avaliação.
- **Queixa:** nas palavras da paciente + procedimentos estéticos prévios.
- **Achados por terço:** superior, médio, inferior (por item da tabela).
- **Pescoço:** ângulo cervicomentual, bandas platismais, gordura subplatismal, glândula submandibular, ventre digástrico, pele.
- **Ultrassom cervical:** equipamento/transdutor, planos superficiais e profundos, medidas (nível IA), cadeia Ib, correlação cirúrgica. Avaliação de pele.
- **Diagnóstico:** síntese, o que pede, o que NÃO pede, diagnóstico final.
- **Plano cirúrgico:** tempos indicados.
- **Perfil de segurança:** comorbidades (ex.: hipertensão, pré-diabetes, ansiedade) para a seção de risco.
- **Imagens (opcional):** fotos padronizadas e imagens do ultrassom para os anexos.

## Menu de referência dos tempos cirúrgicos
Monte a tabela do plano apenas com os itens indicados para o caso:
- Brow lift + denervação do prócero → Elevação do terço superior, descanso do olhar
- Deep Plane Facelift → Reposicionamento profundo dos terços médio e inferior
- Deep Neck estruturado → Tratamento das estruturas profundas do pescoço
- Pálpebra inferior com microfat → Refinamento da região periocular inferior
- Mento com microfat → Volumização e equilíbrio do contorno inferior

## Saída
Markdown completo e limpo (pronto para virar Slides/Notion/PDF). Se solicitado, também a versão HTML/PDF na identidade da marca. Sempre com a assinatura e as ressalvas de método preservadas.

## Assets
- `assets/template-dossie.md` — template mestre com todos os campos `{{...}}` e o texto institucional fixo. **Leia sempre antes de gerar.**

---
**Tags:** Método RV | Documento Clínico | Cirurgia da Face
