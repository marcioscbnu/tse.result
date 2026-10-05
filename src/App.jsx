import { useEffect, useState } from "react";
import MapaBrasil from "./MapaBrasil";
import { carregarResultadosTse } from "./tseResultados";
import "./App.css";

const numero = new Intl.NumberFormat("pt-BR");
const percentual = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const nomesUfs = {
  AC: "Acre",
  AL: "Alagoas",
  AM: "Amazonas",
  AP: "Amapá",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MG: "Minas Gerais",
  MS: "Mato Grosso do Sul",
  MT: "Mato Grosso",
  PA: "Pará",
  PB: "Paraíba",
  PE: "Pernambuco",
  PI: "Piauí",
  PR: "Paraná",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RO: "Rondônia",
  RR: "Roraima",
  RS: "Rio Grande do Sul",
  SC: "Santa Catarina",
  SE: "Sergipe",
  SP: "São Paulo",
  TO: "Tocantins",
};

function FotoCandidato({ candidato }) {
  const [falhou, setFalhou] = useState(false);
  const iniciais = candidato.nome
    .split(/\s+/)
    .slice(0, 2)
    .map(parte => parte[0])
    .join("")
    .toUpperCase();

  return (
    <div className="candidate-photo">
      {candidato.foto && !falhou ? (
        <img
          src={candidato.foto}
          alt={`Foto de ${candidato.nome}`}
          onError={() => setFalhou(true)}
        />
      ) : (
        <div className="photo-placeholder" aria-label={`Foto não informada para ${candidato.nome}`}>
          <span>{iniciais}</span>
          <small>Foto não informada</small>
        </div>
      )}
    </div>
  );
}

function App() {
  const [dados, setDados] = useState({});
  const [filtro, setFiltro] = useState("BR");
  const [atualizacao, setAtualizacao] = useState("");
  const [falhas, setFalhas] = useState([]);
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let ativo = true;

    async function atualizarResultados() {
      try {
        const resposta = await carregarResultadosTse(controller.signal);
        if (!ativo) return;

        setDados(atuais => ({ ...atuais, ...resposta.resultados }));
        setFalhas(resposta.falhas);
        const referencia = resposta.resultados.BR ?? Object.values(resposta.resultados)[0];
        if (referencia?.atualizadoEm) setAtualizacao(referencia.atualizadoEm);
        setErro(!resposta.resultados.BR);
      } catch (falha) {
        if (ativo && falha.name !== "AbortError") setErro(true);
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    void atualizarResultados();
    const intervalo = window.setInterval(atualizarResultados, 60_000);

    return () => {
      ativo = false;
      window.clearInterval(intervalo);
      controller.abort();
    };
  }, []);

  const estados = Object.keys(dados)
    .filter(uf => /^[A-Z]{2}$/.test(uf) && uf !== "BR")
    .sort();
  const estadosPorNome = Object.entries(nomesUfs)
    .map(([sigla, nome]) => ({ sigla, nome, resultado: dados[sigla] }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const totaisPendentes = estadosPorNome.reduce((totais, estado) => {
    if (!estado.resultado) return totais;
    const secoesPendentes = Math.max(
      0,
      estado.resultado.secoesTotal - estado.resultado.secoesTotalizadas,
    );
    const votosEstimados = estado.resultado.secoesTotalizadas > 0
      ? Math.round(
          (estado.resultado.votosValidos / estado.resultado.secoesTotalizadas) *
            secoesPendentes,
        )
      : 0;

    return {
      secoesTotal: totais.secoesTotal + estado.resultado.secoesTotal,
      secoesPendentes: totais.secoesPendentes + secoesPendentes,
      votosEstimados: totais.votosEstimados + votosEstimados,
    };
  }, { secoesTotal: 0, secoesPendentes: 0, votosEstimados: 0 });
  const percentualPendenteTotal = totaisPendentes.secoesTotal > 0
    ? (totaisPendentes.secoesPendentes / totaisPendentes.secoesTotal) * 100
    : 0;
  const resultado = filtro === "BR" ? dados.BR : dados[filtro];
  const candidatos = resultado?.top2 ?? [];
  const titulo = filtro === "BR" ? "Brasil" : filtro;

  function selecionarEstado(uf) {
    setFiltro(uf);
  }

  return (
    <main className="dashboard">
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Painel eleitoral, início">
          <span className="brand-mark">BR</span>
          <span>Painel eleitoral <span className="brand-year">2026</span></span>
        </a>
        <span className="live-status"><span /> TSE · atualização automática</span>
      </header>

      <section className="intro" id="inicio">
        <div>
          <p className="eyebrow">ELEIÇÕES GERAIS · 1º TURNO</p>
          <h1>Resultados, estado por estado.</h1>
          <p className="intro-copy">Acompanhe a disputa e a porcentagem de votos dos dois candidatos mais votados.</p>
        </div>
        <label className="state-picker">
          <span>Visualização</span>
          <select value={filtro} onChange={e => selecionarEstado(e.target.value)}>
            <option value="BR">Brasil · Presidência</option>
            {estados.map(uf => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </label>
      </section>

      {(erro || falhas.length > 0) && (
        <p className="data-notice" role="status">
          {erro
            ? "Não foi possível atualizar a apuração do TSE. A última leitura disponível será mantida."
            : `Não foi possível atualizar ${falhas.length} localidade(s); os últimos dados recebidos foram mantidos.`}
        </p>
      )}

      <div className="content-grid">
          <section className="map-panel" aria-label="Mapa de seleção dos estados">
            <div className="section-heading">
              <div>
                <p className="eyebrow">APURAÇÃO POR UF</p>
                <h2>Mapa do Brasil</h2>
              </div>
              <span className="map-hint">Selecione um estado</span>
            </div>
            <MapaBrasil resultados={dados} filtro={filtro} onSelectUf={selecionarEstado} />
            <div className="map-legend" aria-label="Legenda do mapa">
              <span className="legend-swatch leader-pl" /> PL lidera
              <span className="legend-swatch leader-pt" /> PT lidera
              <span className="legend-swatch leader-other" /> Outro candidato lidera
            </div>
          </section>

          <section className="results-panel" aria-live="polite">
            <div className="section-heading result-heading">
              <div>
                <p className="eyebrow">{filtro === "BR" ? "DISPUTA PRESIDENCIAL" : "DOIS PRIMEIROS COLOCADOS"}</p>
                <h2>{titulo}</h2>
              </div>
            </div>

            {candidatos.length >= 2 ? (
              <>
                <div className="candidate-list">
                  {candidatos.slice(0, 2).map((candidato, index) => (
                    <article className={`candidate candidate-${index + 1}`} key={`${candidato.nome}-${index}`}>
                      <FotoCandidato candidato={candidato} />
                      <div className="candidate-details">
                        <div className="candidate-topline">
                          <span className="candidate-position">{index === 0 ? "01º" : "02º"} colocado</span>
                          <span className="candidate-party">{candidato.partido || "Partido não informado"}</span>
                        </div>
                        <h3>{candidato.nome}</h3>
                        <div className="candidate-stats">
                          <strong>{percentual.format(candidato.percentual ?? 0)}<small>%</small></strong>
                          {Number.isFinite(candidato.votos) && <span>{numero.format(candidato.votos)} votos</span>}
                        </div>
                        <div className="vote-track" aria-label={`${percentual.format(candidato.percentual ?? 0)}% dos votos`}>
                          <span style={{ width: `${Math.max(0, Math.min(candidato.percentual ?? 0, 100))}%` }} />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
                <footer className="result-footer">
                  <span>Urnas apuradas</span>
                  <strong>{percentual.format(resultado.apurado ?? 0)}%</strong>
                </footer>
              </>
            ) : (
              <div className="empty-state">
                <span className="empty-mark">—</span>
                <h3>{carregando ? "Carregando resultados do TSE" : filtro === "BR" ? "Resultado nacional indisponível" : "Resultado ainda indisponível"}</h3>
                <p>{filtro === "BR"
                  ? erro ? "A fonte oficial não respondeu. Tente novamente em instantes." : "Aguardando os resultados presidenciais nacionais da fonte oficial."
                  : `Ainda não há dados oficiais disponíveis para ${titulo}.`}</p>
              </div>
            )}
          </section>
      </div>

      <section className="state-list-section" aria-labelledby="state-list-title">
        <div className="section-heading state-list-heading">
          <div>
            <p className="eyebrow">DISPUTA PRESIDENCIAL</p>
            <h2 id="state-list-title">Flávio x Lula por UF</h2>
          </div>
          <span className="map-hint">Ordenado pelo nome da UF · votos pendentes estimados</span>
        </div>
        <div className="state-table-wrap">
          <table className="state-table">
            <thead>
              <tr>
                <th scope="col">Estado</th>
                <th scope="col">Flávio x Lula</th>
                <th scope="col">Urnas a apurar</th>
                <th scope="col">Votos estimados*</th>
                <th scope="col">% de urnas a apurar</th>
              </tr>
            </thead>
            <tbody>
              {estadosPorNome.map(({ sigla, nome, resultado: resultadoUf }) => {
                const secoesPendentes = resultadoUf
                  ? Math.max(0, resultadoUf.secoesTotal - resultadoUf.secoesTotalizadas)
                  : null;
                const votosEstimados = resultadoUf?.secoesTotalizadas > 0
                  ? Math.round(
                      (resultadoUf.votosValidos / resultadoUf.secoesTotalizadas) *
                        secoesPendentes,
                    )
                  : null;
                const percentualPendente = resultadoUf?.secoesTotal > 0
                  ? (secoesPendentes / resultadoUf.secoesTotal) * 100
                  : null;

                return (
                  <tr key={sigla}>
                    <th scope="row" className="state-name-cell">
                      <button type="button" onClick={() => selecionarEstado(sigla)}>
                        {nome}<small>{sigla}</small>
                      </button>
                    </th>
                    <td>
                      {resultadoUf ? (
                        <div className="flavio-lula-cell">
                          <span className="flavio-result">
                            <b>{resultadoUf.flavio?.nome ?? "Flávio Bolsonaro"}</b>
                            <strong>{percentual.format(resultadoUf.flavio?.percentual ?? 0)}%</strong>
                          </span>
                          <span className="matchup-x">x</span>
                          <span className="lula-result">
                            <b>{resultadoUf.lula?.nome ?? "Lula"}</b>
                            <strong>{percentual.format(resultadoUf.lula?.percentual ?? 0)}%</strong>
                          </span>
                        </div>
                      ) : <span className="state-pending">Aguardando TSE</span>}
                    </td>
                    <td className="number-cell">
                      {secoesPendentes === null ? "—" : numero.format(secoesPendentes)}
                    </td>
                    <td className="number-cell">
                      {votosEstimados === null ? "—" : numero.format(votosEstimados)}
                    </td>
                    <td className="remaining-cell">
                      {percentualPendente === null
                        ? "—"
                        : `${percentual.format(percentualPendente)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Total das UFs</th>
                <td>
                  {dados.BR && (
                    <div className="flavio-lula-cell">
                      <span className="flavio-result">
                        <b>{dados.BR.flavio?.nome ?? "Flávio Bolsonaro"}</b>
                        <strong>{percentual.format(dados.BR.flavio?.percentual ?? 0)}%</strong>
                      </span>
                      <span className="matchup-x">x</span>
                      <span className="lula-result">
                        <b>{dados.BR.lula?.nome ?? "Lula"}</b>
                        <strong>{percentual.format(dados.BR.lula?.percentual ?? 0)}%</strong>
                      </span>
                    </div>
                  )}
                </td>
                <td className="number-cell">{numero.format(totaisPendentes.secoesPendentes)}</td>
                <td className="number-cell">{numero.format(totaisPendentes.votosEstimados)}</td>
                <td className="remaining-cell">{percentual.format(percentualPendenteTotal)}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="estimate-note">
          * Estimativa calculada pela média de votos válidos por seção já totalizada em cada UF.
        </p>
      </section>

      <footer className="footer-note">
        Fonte: TSE <span>·</span> Atualização oficial: {resultado?.atualizadoEm ?? (atualizacao || "aguardando")}
      </footer>
    </main>
  );
}

export default App;
