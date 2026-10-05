import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";

const geoUrl = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson";
const percentual = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function MapaBrasil({ resultados, filtro, onSelectUf }) {
  return (
    <div className="map-canvas">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 760, center: [-54, -15] }}
        className="brazil-map"
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map(geo => {
              const uf = geo.properties.sigla;
              const info = resultados[uf] || null;
              const selecionado = filtro === uf;
              const lider = info?.top2?.[0];
              const partidoLider = lider?.partido?.toUpperCase();
              const classeLider = partidoLider === "PL"
                ? "pl"
                : partidoLider === "PT"
                  ? "pt"
                  : "outro";
              const cor = {
                pl: "#3b82f6",
                pt: "#ef4444",
                outro: "#e7e3da",
              }[classeLider];
              const resumo = info?.top2?.slice(0, 2)
                .map(candidato => `${candidato.nome} (${candidato.partido || "partido não informado"}) ${percentual.format(candidato.percentual ?? 0)}%`)
                .join(" · ");

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={cor}
                  stroke="#111111"
                  strokeWidth={selecionado ? 1.8 : 0.8}
                  className="state-shape"
                  onClick={() => onSelectUf?.(uf)}
                  data-tooltip-id="map-tooltip"
                  data-tooltip-content={`${uf}${resumo ? ` · ${resumo}` : " · sem dados"}${info ? ` · urnas apuradas ${percentual.format(info.apurado ?? 0)}%` : ""}`}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
      <Tooltip id="map-tooltip" />
    </div>
  );
}

export default MapaBrasil;
