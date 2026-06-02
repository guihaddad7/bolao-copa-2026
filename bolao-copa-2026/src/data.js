export const GRUPOS = {
  A:["México 🇲🇽","África do Sul 🇿🇦","Coreia do Sul 🇰🇷","Rep. Tcheca 🇨🇿"],
  B:["Canadá 🇨🇦","Bósnia 🇧🇦","Catar 🇶🇦","Suíça 🇨🇭"],
  C:["Brasil 🇧🇷","Marrocos 🇲🇦","Haiti 🇭🇹","Escócia 🏴󠁧󠁢󠁳󠁣󠁴󠁿"],
  D:["EUA 🇺🇸","Paraguai 🇵🇾","Austrália 🇦🇺","Turquia 🇹🇷"],
  E:["Alemanha 🇩🇪","Curaçao 🇨🇼","Costa do Marfim 🇨🇮","Equador 🇪🇨"],
  F:["Holanda 🇳🇱","Japão 🇯🇵","Suécia 🇸🇪","Tunísia 🇹🇳"],
  G:["Bélgica 🇧🇪","Egito 🇪🇬","Irã 🇮🇷","Nova Zelândia 🇳🇿"],
  H:["Espanha 🇪🇸","Cabo Verde 🇨🇻","Arábia Saudita 🇸🇦","Uruguai 🇺🇾"],
  I:["França 🇫🇷","Senegal 🇸🇳","Iraque 🇮🇶","Noruega 🇳🇴"],
  J:["Argentina 🇦🇷","Argélia 🇩🇿","Áustria 🇦🇹","Jordânia 🇯🇴"],
  K:["Portugal 🇵🇹","RD Congo 🇨🇩","Uzbequistão 🇺🇿","Colômbia 🇨🇴"],
  L:["Inglaterra 🏴󠁧󠁢󠁥󠁮󠁧󠁿","Croácia 🇭🇷","Gana 🇬🇭","Panamá 🇵🇦"],
};
export const GK = Object.keys(GRUPOS);

export const R32 = [
  {id:0,m:"M73",a:"2A",b:"2B",date:"28/Jun"},{id:1,m:"M74",a:"1E",b:"T1",date:"28/Jun"},
  {id:2,m:"M75",a:"1F",b:"2C",date:"29/Jun"},{id:3,m:"M76",a:"1C",b:"2F",date:"29/Jun"},
  {id:4,m:"M77",a:"1I",b:"T2",date:"30/Jun"},{id:5,m:"M78",a:"2E",b:"2I",date:"30/Jun"},
  {id:6,m:"M79",a:"1A",b:"T3",date:"1/Jul"},{id:7,m:"M80",a:"1L",b:"T4",date:"1/Jul"},
  {id:8,m:"M81",a:"1D",b:"T5",date:"2/Jul"},{id:9,m:"M82",a:"1G",b:"T6",date:"2/Jul"},
  {id:10,m:"M83",a:"2K",b:"2L",date:"3/Jul"},{id:11,m:"M84",a:"1H",b:"2J",date:"3/Jul"},
  {id:12,m:"M85",a:"1B",b:"T7",date:"28/Jun"},{id:13,m:"M86",a:"1J",b:"2H",date:"29/Jun"},
  {id:14,m:"M87",a:"1K",b:"T8",date:"30/Jun"},{id:15,m:"M88",a:"2D",b:"2G",date:"1/Jul"},
];
export const OIT  = [[0,1],[2,3],[4,5],[6,7],[8,9],[10,11],[12,13],[14,15]];
export const QUAR = [[0,1],[2,3],[4,5],[6,7]];
export const SEMI = [[0,1],[2,3]];
export const COPA_START = new Date("2026-06-11T19:00:00Z");

export const PREMIOS = [
  {id:"melhorJogador",label:"Melhor Jogador",icon:"⭐",pts:15,desc:"Bola de Ouro",ph:"Ex: Vinicius Jr."},
  {id:"artilheiro",label:"Artilheiro",icon:"⚽",pts:12,desc:"Chuteira de Ouro",ph:"Ex: Mbappé"},
  {id:"melhorGoleiro",label:"Melhor Goleiro",icon:"🧤",pts:10,desc:"Luva de Ouro",ph:"Ex: Alisson"},
  {id:"maisPasses",label:"Maior Assistente",icon:"🎯",pts:10,desc:"Mais assistências",ph:"Ex: De Bruyne"},
  {id:"melhorJovem",label:"Melhor Jovem",icon:"🌟",pts:12,desc:"Young Player (sub-21)",ph:"Ex: Endrick"},
];

export const FASE_COR = {
  Grupos:"#4fc3f7",R32:"#ce93d8",Oitavas:"#80cbc4",
  Quartas:"#ffb74d",Semi:"#ffd54f",Final:"#f0c040",
  Prêmios:"#f48fb1",Admin:"#ff7043"
};

export const REACOES = ["🔥","😭","👏","😤","🤯","💀","🎉","👑"];

export function calcPts(p, r, todos) {
  if (!r || !p) return 0;
  let pts = 0;
  GK.forEach(g => {
    const pg=p.grupos?.[g], rg=r.grupos?.[g]; if(!pg||!rg) return;
    if(rg.primeiro&&(pg.primeiro===rg.primeiro||pg.segundo===rg.primeiro)) pts+=3;
    if(rg.segundo&&(pg.primeiro===rg.segundo||pg.segundo===rg.segundo)) pts+=3;
    if(pg.primeiro===rg.primeiro) pts+=2;
    const tm=r.terceirosMelhores||[];
    if(pg.terceiro&&tm.includes(pg.terceiro)&&pg.terceiro===rg.terceiro) pts+=2;
  });
  const fp={r32:5,oitavas:8,quartas:13,semi:21};
  Object.entries(fp).forEach(([fase,fpPts])=>{
    const pa=p.bracket?.[fase]||[], ra=r.bracket?.[fase]||[];
    pa.forEach((t,i)=>{
      if(!t||!ra[i]||t!==ra[i]) return;
      const solo=!todos.filter(x=>x.nome!==p.nome).some(x=>(x.bracket?.[fase]||[])[i]===t);
      pts+=solo?Math.round(fpPts*1.5):fpPts;
    });
  });
  [0,1].forEach(i=>{ if(p.bracket?.semi?.[i]&&r.bracket?.semi?.[i]&&p.bracket.semi[i]===r.bracket.semi[i]) pts+=34; });
  if(p.bracket?.campeao&&r.bracket?.campeao&&p.bracket.campeao===r.bracket.campeao) pts+=55;
  PREMIOS.forEach(({id,pts:pp})=>{
    const pv=p.premios?.[id]?.toLowerCase().trim(), rv=r.premios?.[id]?.toLowerCase().trim();
    if(!pv||!rv||pv!==rv) return;
    const solo=!todos.filter(x=>x.nome!==p.nome).some(x=>x.premios?.[id]?.toLowerCase().trim()===rv);
    pts+=solo?pp*2:pp;
  });
  return pts;
}
