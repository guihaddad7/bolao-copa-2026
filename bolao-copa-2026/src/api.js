import { API_FOOTBALL_KEY, API_FOOTBALL_BASE, FIFA_2026_LEAGUE_ID, SEASON } from './config';

const headers = { "x-apisports-key": API_FOOTBALL_KEY };

const call = async (endpoint) => {
  const res = await fetch(`${API_FOOTBALL_BASE}${endpoint}`, { headers });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
};

// Nomes da API → nomes com emoji
const TEAM_MAP = {
  "Mexico":"México 🇲🇽","South Africa":"África do Sul 🇿🇦","Korea Republic":"Coreia do Sul 🇰🇷",
  "Czech Republic":"Rep. Tcheca 🇨🇿","Canada":"Canadá 🇨🇦","Bosnia":"Bósnia 🇧🇦","Qatar":"Catar 🇶🇦",
  "Switzerland":"Suíça 🇨🇭","Brazil":"Brasil 🇧🇷","Morocco":"Marrocos 🇲🇦","Haiti":"Haiti 🇭🇹",
  "Scotland":"Escócia 🏴󠁧󠁢󠁳󠁣󠁴󠁿","USA":"EUA 🇺🇸","United States":"EUA 🇺🇸","Paraguay":"Paraguai 🇵🇾",
  "Australia":"Austrália 🇦🇺","Turkey":"Turquia 🇹🇷","Germany":"Alemanha 🇩🇪","Curacao":"Curaçao 🇨🇼",
  "Ivory Coast":"Costa do Marfim 🇨🇮","Ecuador":"Equador 🇪🇨","Netherlands":"Holanda 🇳🇱",
  "Japan":"Japão 🇯🇵","Sweden":"Suécia 🇸🇪","Tunisia":"Tunísia 🇹🇳","Belgium":"Bélgica 🇧🇪",
  "Egypt":"Egito 🇪🇬","Iran":"Irã 🇮🇷","New Zealand":"Nova Zelândia 🇳🇿","Spain":"Espanha 🇪🇸",
  "Cape Verde":"Cabo Verde 🇨🇻","Saudi Arabia":"Arábia Saudita 🇸🇦","Uruguay":"Uruguai 🇺🇾",
  "France":"França 🇫🇷","Senegal":"Senegal 🇸🇳","Iraq":"Iraque 🇮🇶","Norway":"Noruega 🇳🇴",
  "Argentina":"Argentina 🇦🇷","Algeria":"Argélia 🇩🇿","Austria":"Áustria 🇦🇹","Jordan":"Jordânia 🇯🇴",
  "Portugal":"Portugal 🇵🇹","DR Congo":"RD Congo 🇨🇩","Uzbekistan":"Uzbequistão 🇺🇿",
  "Colombia":"Colômbia 🇨🇴","England":"Inglaterra 🏴󠁧󠁢󠁥󠁮󠁧󠁿","Croatia":"Croácia 🇭🇷",
  "Ghana":"Gana 🇬🇭","Panama":"Panamá 🇵🇦",
};
export const normTeam = (name) => TEAM_MAP[name] || name;

export const fetchStandings = async () => {
  const data = await call(`/standings?league=${FIFA_2026_LEAGUE_ID}&season=${SEASON}`);
  const grupos = {};
  const standings = data?.response?.[0]?.league?.standings || [];
  standings.forEach(grupo => {
    if (!Array.isArray(grupo)) return;
    grupo.forEach((team, pos) => {
      const grpLetter = team.group?.replace(/[^A-L]/g,"") || "";
      if (!grpLetter) return;
      if (!grupos[grpLetter]) grupos[grpLetter] = [];
      grupos[grpLetter].push({ pos: pos+1, nome: normTeam(team.team.name), pts: team.points });
    });
  });
  return grupos;
};

export const fetchFixtures = async () => {
  const data = await call(`/fixtures?league=${FIFA_2026_LEAGUE_ID}&season=${SEASON}`);
  return data?.response || [];
};

export const fetchLive = async () => {
  const data = await call(`/fixtures?live=all&league=${FIFA_2026_LEAGUE_ID}`);
  return data?.response || [];
};

export const processFixtures = (fixtures) => {
  const jogosRecentes = [];
  const bracketR32 = Array(16).fill("");
  const bracketOit = Array(8).fill("");
  const bracketQuar = Array(4).fill("");
  const bracketSemi = Array(2).fill("");
  let campeao = "";
  const jogosAoVivo = [];

  const LIVE = ["1H","2H","HT","ET","P"];
  const DONE = ["FT","AET","PEN"];

  fixtures.forEach(f => {
    const status = f.fixture?.status?.short;
    const concluido = DONE.includes(status);
    const aoVivo = LIVE.includes(status);
    const home = normTeam(f.teams?.home?.name || "");
    const away = normTeam(f.teams?.away?.name || "");
    const homeWin = f.teams?.home?.winner;
    const awayWin = f.teams?.away?.winner;
    const hg = f.goals?.home ?? 0;
    const ag = f.goals?.away ?? 0;
    const round = f.league?.round || "";

    if (aoVivo) {
      jogosAoVivo.push({ home, away, hg, ag, min: f.fixture?.status?.elapsed || "" });
    }

    if ((concluido || aoVivo) && jogosRecentes.length < 10) {
      jogosRecentes.unshift({
        times: `${home} ${hg}×${ag} ${away}`,
        fase: round,
        data: new Date(f.fixture?.date).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"}),
        aoVivo
      });
    }

    if (concluido || aoVivo) {
      const venc = homeWin ? home : awayWin ? away : "";
      if (!venc) return;
      if (/Round of 32|16th-finals/i.test(round)) {
        const idx = fixtures.filter(x=>/Round of 32|16th-finals/i.test(x.league?.round||"")).indexOf(f);
        if (idx >= 0 && idx < 16) bracketR32[idx] = venc;
      } else if (/Round of 16|Eighth-finals/i.test(round)) {
        const idx = fixtures.filter(x=>/Round of 16|Eighth-finals/i.test(x.league?.round||"")).indexOf(f);
        if (idx >= 0 && idx < 8) bracketOit[idx] = venc;
      } else if (/Quarter-final/i.test(round)) {
        const idx = fixtures.filter(x=>/Quarter-final/i.test(x.league?.round||"")).indexOf(f);
        if (idx >= 0 && idx < 4) bracketQuar[idx] = venc;
      } else if (/Semi-final/i.test(round)) {
        const idx = fixtures.filter(x=>/Semi-final/i.test(x.league?.round||"")).indexOf(f);
        if (idx >= 0 && idx < 2) bracketSemi[idx] = venc;
      } else if (/Final$/i.test(round)) {
        campeao = venc;
      }
    }
  });

  return { jogosRecentes, jogosAoVivo, bracket: { r32: bracketR32, oitavas: bracketOit, quartas: bracketQuar, semi: bracketSemi, campeao } };
};

export const getFaseAtual = (fixtures) => {
  const live = fixtures.filter(f => ["1H","2H","HT","ET","P"].includes(f.fixture?.status?.short));
  if (live.length > 0) {
    const round = live[0].league?.round || "";
    if (/Group/i.test(round)) return "🟢 Fase de Grupos AO VIVO";
    if (/Round of 32/i.test(round)) return "🟢 R32 AO VIVO";
    if (/Round of 16/i.test(round)) return "🟢 Oitavas AO VIVO";
    if (/Quarter/i.test(round)) return "🟢 Quartas AO VIVO";
    if (/Semi/i.test(round)) return "🟢 Semifinal AO VIVO";
    if (/Final/i.test(round)) return "🟢 FINAL AO VIVO";
  }
  const done = fixtures.filter(f => ["FT","AET","PEN"].includes(f.fixture?.status?.short));
  if (!done.length) return "Pré-copa";
  const last = done[done.length-1]?.league?.round || "";
  if (/Final$/i.test(last)) return "🏆 Copa Encerrada";
  if (/Semi/i.test(last)) return "Final";
  if (/Quarter/i.test(last)) return "Semifinais";
  if (/Round of 16/i.test(last)) return "Quartas de Final";
  if (/Round of 32/i.test(last)) return "Oitavas de Final";
  return "Fase de Grupos";
};
