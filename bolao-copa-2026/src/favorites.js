// ═══════════════════════════════════════════════════════════════
// BRACKET AUTO-FILL COM FAVORITOS
// Baseado em odds reais (Polymarket + Kalshi + Betano, Jun 2026)
// ═══════════════════════════════════════════════════════════════

// Probabilidade implícita de cada seleção vencer a Copa (%)
export const ODDS_CAMPEAO = {
  "França 🇫🇷": 17.1,
  "Espanha 🇪🇸": 16.5,
  "Inglaterra 🏴󠁧󠁢󠁥󠁮󠁧󠁿": 11.2,
  "Argentina 🇦🇷": 10.5,
  "Brasil 🇧🇷": 9.0,
  "Alemanha 🇩🇪": 8.0,
  "Portugal 🇵🇹": 6.5,
  "Holanda 🇳🇱": 4.5,
  "Bélgica 🇧🇪": 2.5,
  "Colômbia 🇨🇴": 2.0,
  "EUA 🇺🇸": 1.8,
  "México 🇲🇽": 1.5,
  "Uruguai 🇺🇾": 1.2,
  "Marrocos 🇲🇦": 1.0,
  "Japão 🇯🇵": 0.9,
  "Croácia 🇭🇷": 0.8,
  "Senegal 🇸🇳": 0.7,
  "Noruega 🇳🇴": 0.7,
  "Equador 🇪🇨": 0.5,
  "Suíça 🇨🇭": 0.5,
  "Canadá 🇨🇦": 0.4,
  "Coreia do Sul 🇰🇷": 0.4,
  "Austrália 🇦🇺": 0.3,
  "Turquia 🇹🇷": 0.3,
  "Áustria 🇦🇹": 0.3,
  "Escócia 🏴󠁧󠁢󠁳󠁣󠁴󠁿": 0.2,
  "Paraguai 🇵🇾": 0.2,
  "Egito 🇪🇬": 0.2,
  "Costa do Marfim 🇨🇮": 0.2,
  "Irã 🇮🇷": 0.15,
  "RD Congo 🇨🇩": 0.1,
  "Uzbequistão 🇺🇿": 0.1,
  "Nova Zelândia 🇳🇿": 0.1,
  "Argélia 🇩🇿": 0.1,
  "Jordânia 🇯🇴": 0.08,
  "África do Sul 🇿🇦": 0.08,
  "Rep. Tcheca 🇨🇿": 0.08,
  "Bósnia 🇧🇦": 0.06,
  "Catar 🇶🇦": 0.05,
  "Cabo Verde 🇨🇻": 0.05,
  "Arábia Saudita 🇸🇦": 0.05,
  "Tunísia 🇹🇳": 0.05,
  "Iraque 🇮🇶": 0.04,
  "Curaçao 🇨🇼": 0.03,
  "Gana 🇬🇭": 0.03,
  "Panamá 🇵🇦": 0.02,
  "Haiti 🇭🇹": 0.01,
};

// Retorna a seleção mais forte entre dois times baseado nas odds
function favorito(timeA, timeB) {
  if (!timeA) return timeB;
  if (!timeB) return timeA;
  const oddsA = ODDS_CAMPEAO[timeA] || 0.1;
  const oddsB = ODDS_CAMPEAO[timeB] || 0.1;
  return oddsA >= oddsB ? timeA : timeB;
}

// Monta os grupos com os favoritos de cada grupo
export function gruposFavoritos(GRUPOS) {
  const grupos = {};
  Object.entries(GRUPOS).forEach(([letra, times]) => {
    // Ordena pelo odds de cada time
    const sorted = [...times].sort((a, b) => (ODDS_CAMPEAO[b] || 0) - (ODDS_CAMPEAO[a] || 0));
    grupos[letra] = {
      primeiro: sorted[0] || "",
      segundo: sorted[1] || "",
      terceiro: sorted[2] || "",
    };
  });
  return grupos;
}

// Escolhe os 8 melhores terceiros baseado nas odds
export function terceirosFavoritos(grupos, GRUPO_KEYS) {
  const terceiros = GRUPO_KEYS
    .map(g => grupos[g]?.terceiro)
    .filter(Boolean)
    .sort((a, b) => (ODDS_CAMPEAO[b] || 0) - (ODDS_CAMPEAO[a] || 0))
    .slice(0, 8);
  return terceiros;
}

// Preenche os prêmios com os favoritos das odds
export const PREMIOS_FAVORITOS = {
  melhorJogador: "Kylian Mbappé",
  artilheiro: "Kylian Mbappé",
  melhorGoleiro: "Thibaut Courtois",
  maisPasses: "Pedri",
  melhorJovem: "Lamine Yamal",
};

// Monta o bracket completo com favoritos
export function bracketFavoritos(grupos, terceiros, R32, OIT, QUAR, SEMI) {
  const B = {
    r32: Array(16).fill(""),
    oitavas: Array(8).fill(""),
    quartas: Array(4).fill(""),
    semi: Array(2).fill(""),
    campeao: "",
  };

  // Resolver time de um código (ex: "1C" = 1º do grupo C)
  const resolve = (code) => {
    if (!code) return null;
    const m = code.match(/^([12])([A-L])$/);
    if (m) return grupos[m[2]]?.[m[1]==="1"?"primeiro":"segundo"] || null;
    const t = code.match(/^T(\d+)$/);
    if (t) return terceiros[parseInt(t[1])-1] || null;
    return code;
  };

  // R32: preenche os vencedores
  R32.forEach(jogo => {
    const tA = resolve(jogo.a);
    const tB = resolve(jogo.b);
    B.r32[jogo.id] = favorito(tA, tB);
  });

  // Oitavas
  OIT.forEach(([a, b], i) => {
    B.oitavas[i] = favorito(B.r32[a], B.r32[b]);
  });

  // Quartas
  QUAR.forEach(([a, b], i) => {
    B.quartas[i] = favorito(B.oitavas[a], B.oitavas[b]);
  });

  // Semis
  SEMI.forEach(([a, b], i) => {
    B.semi[i] = favorito(B.quartas[a], B.quartas[b]);
  });

  // Final
  B.campeao = favorito(B.semi[0], B.semi[1]);

  return B;
}
