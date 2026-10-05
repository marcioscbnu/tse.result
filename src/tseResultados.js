const BASE_URL = "https://resultados.tse.jus.br/oficial/ele2026/6257";
const UFS =
  "AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO".split(
    " ",
  );

function decodificarJws(token) {
  const partes = token.trim().split(".");
  if (partes.length !== 3) throw new Error("Resposta JWS inválida do TSE");

  const base64 = partes[1].replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(
    atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")),
    (caractere) => caractere.charCodeAt(0),
  );
  return JSON.parse(new TextDecoder().decode(bytes));
}

function numeroTse(valor) {
  return Number(String(valor ?? "0").replace(",", "."));
}

function converterResultado(payload, area) {
  const cargo =
    payload.carg?.find((item) => item.cd === "1") ?? payload.carg?.[0];
  const todosCandidatos =
    cargo?.agr?.flatMap((agrupamento) =>
      agrupamento.par.flatMap((partido) =>
        partido.cand.map((candidato) => ({
          nome: candidato.nmu || candidato.nm,
          partido: partido.sg || partido.nm,
          votos: numeroTse(candidato.vap),
          percentual: numeroTse(candidato.pvap),
          foto: candidato.sqcand
            ? `${BASE_URL}/fotos/br/${candidato.sqcand}.jpeg`
            : undefined,
          situacao: candidato.dvt,
        })),
      ),
    ) ?? [];
  const validos = todosCandidatos.filter(
    (candidato) => candidato.situacao === "Válido",
  );
  const flavio = validos.find(
    (candidato) =>
      candidato.nome.toUpperCase().includes("FLAVIO") &&
      candidato.nome.toUpperCase().includes("BOLSONARO"),
  );
  const lula = validos.find((candidato) => candidato.partido === "PT");
  const ordenados = (validos.length ? validos : todosCandidatos)
    .sort((a, b) => b.votos - a.votos)
    .slice(0, 2);

  if (ordenados.length < 2)
    throw new Error(`Resultado incompleto para ${area}`);

  return {
    apurado: numeroTse(payload.s?.pst),
    secoesTotal: Number(payload.s?.ts ?? 0),
    secoesTotalizadas: Number(payload.s?.st ?? 0),
    votosValidos: numeroTse(payload.v?.vvc),
    flavio,
    lula,
    top2: ordenados,
    atualizadoEm: `${payload.dg} ${payload.hg}`,
  };
}

async function buscarArea(area, cacheBust, signal) {
  const prefixo = area.toLowerCase();
  const arquivo = `${prefixo}-c0001-e006257-u.jws`;
  const url = `${BASE_URL}/dados/${prefixo}/${arquivo}?nocache=${cacheBust}`;
  const resposta = await fetch(url, { cache: "no-store", signal });
  if (!resposta.ok)
    throw new Error(`TSE respondeu ${resposta.status} para ${area}`);

  const payload = decodificarJws(await resposta.text());
  return [area === "BR" ? "BR" : area, converterResultado(payload, area)];
}

export async function carregarResultadosTse(signal) {
  const cacheBust = Date.now();
  const areas = ["BR", ...UFS];
  const respostas = await Promise.allSettled(
    areas.map((area) => buscarArea(area, cacheBust, signal)),
  );
  const resultados = {};
  const falhas = [];

  respostas.forEach((resposta, indice) => {
    if (resposta.status === "fulfilled") {
      const [area, resultado] = resposta.value;
      resultados[area] = resultado;
    } else if (resposta.reason?.name !== "AbortError") {
      falhas.push(areas[indice]);
    }
  });

  return { resultados, falhas };
}
