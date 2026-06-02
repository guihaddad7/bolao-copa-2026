import { useState, useEffect, useCallback, useRef } from "react";
import { GRUPOS, GK, R32, OIT, QUAR, SEMI, COPA_START, PREMIOS, FASE_COR, REACOES, calcPts } from "./data";
import { gruposFavoritos, terceirosFavoritos, bracketFavoritos, PREMIOS_FAVORITOS } from "./favorites";
import { getPalpites, savePalpites, getResultados, saveResultados, getReacoes, saveReacoes } from "./storage";
import { fetchFixtures, fetchLive, fetchStandings, processFixtures, getFaseAtual } from "./api";
import { ADMIN_SENHA } from "./config";
import "./index.css";

// ─── UTILITÁRIOS ──────────────────────────────────────────────────
const fl = (n) => n ? n.split(" ").slice(-1)[0] : "?";
const nm = (n) => n ? n.split(" ").slice(0,-1).join(" ") || n : null;

function Tag({t, sm}) {
  const c = FASE_COR[t] || "#aaa";
  return <span style={{display:"inline-flex",alignItems:"center",padding:"2px 7px",borderRadius:20,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:sm?9:10,letterSpacing:".08em",whiteSpace:"nowrap",color:c,background:`${c}20`,border:`1px solid ${c}40`}}>{t}</span>;
}

// ─── HERO ──────────────────────────────────────────────────────────
function Hero({nPartic, fase, syncing, jogosAoVivo}) {
  return (
    <div className="hero">
      <svg className="hero-field" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
        <rect width="400" height="200" fill="none" stroke="#f0c040" strokeWidth="2"/>
        <line x1="200" y1="0" x2="200" y2="200" stroke="#f0c040" strokeWidth="1.5"/>
        <circle cx="200" cy="100" r="32" fill="none" stroke="#f0c040" strokeWidth="1.5"/>
        <circle cx="200" cy="100" r="3" fill="#f0c040" opacity=".5"/>
        <rect x="0" y="68" width="55" height="64" fill="none" stroke="#f0c040" strokeWidth="1.5"/>
        <rect x="345" y="68" width="55" height="64" fill="none" stroke="#f0c040" strokeWidth="1.5"/>
      </svg>
      <div className="hero-top-line"/>
      <div className="hero-content">
        <div className="hero-trophy float">🏆</div>
        <div className="hero-sub">BOLÃO OFICIAL</div>
        <h1 className="hero-title">COPA 2026</h1>
        <div className="hero-sedes">
          {["🇺🇸 EUA","🇲🇽 MÉXICO","🇨🇦 CANADÁ"].map(f=><span key={f}>{f}</span>)}
        </div>
        <div className="hero-badges">
          <span className="hbadge gold">11 JUN – 19 JUL 2026</span>
          {nPartic>0 && <span className="hbadge green">👥 {nPartic} participante{nPartic!==1?"s":""}</span>}
          {fase && <span className="hbadge pink">📡 {fase}</span>}
          {syncing && <span className="hbadge blue pulse">⟳ ao vivo</span>}
        </div>
        {jogosAoVivo?.length > 0 && (
          <div className="live-games">
            {jogosAoVivo.map((j,i) => (
              <div key={i} className="live-game">
                <div className="live-dot pulse"/>
                <span>{j.home} {j.hg}:{j.ag} {j.away}{j.min ? ` ${j.min}'` : ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="hero-bottom-line"/>
    </div>
  );
}

// ─── LIVE FEED ─────────────────────────────────────────────────────
function LiveFeed({resultados}) {
  const jogos = resultados?.jogosRecentes || [];
  if (!jogos.length) return null;
  return (
    <div className="section">
      <div className="card">
        <div className="feed-header">
          <div className="live-dot pulse"/>
          <span className="feed-title">RESULTADOS DA COPA</span>
          {resultados?.ultimaSync && (
            <span className="feed-time">{new Date(resultados.ultimaSync).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span>
          )}
        </div>
        {jogos.slice(0,6).map((j,i) => (
          <div key={i} className={`feed-item ${j.aoVivo?"live":""}`}>
            {j.aoVivo && <div className="live-dot pulse" style={{width:5,height:5,flexShrink:0}}/>}
            <div>
              <div className="feed-score">{j.times}</div>
              <div className="feed-round">{j.fase}{j.data ? ` · ${j.data}` : ""}</div>
            </div>
            {j.aoVivo && <span className="feed-live-tag">AO VIVO</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── GRUPO STEP ────────────────────────────────────────────────────
function GrupoStep({grp, grupos, onSetPos, onNext, onBack, etapa}) {
  const times = GRUPOS[grp], g = grupos[grp] || {};
  const click = (t) => {
    if(g.primeiro===t){onSetPos(grp,"primeiro","");return;}
    if(g.segundo===t){onSetPos(grp,"segundo","");return;}
    if(g.terceiro===t){onSetPos(grp,"terceiro","");return;}
    if(!g.primeiro){onSetPos(grp,"primeiro",t);return;}
    if(!g.segundo){onSetPos(grp,"segundo",t);return;}
    if(!g.terceiro) onSetPos(grp,"terceiro",t);
  };
  const cls = (t) => g.primeiro===t?"s1":g.segundo===t?"s2":"";
  const lbl = (t) => g.primeiro===t?"1º":g.segundo===t?"2º":g.terceiro===t?"3º":null;
  const ok = !!(g.primeiro && g.segundo);
  return (
    <div className="card fadein wizard-card">
      <div className="grupo-header">
        <div>
          <div className="grupo-title">GRUPO {grp}</div>
          <div className="grupo-sub">Etapa {etapa+1}/12</div>
        </div>
        <div className="pos-badges">
          {[{k:"primeiro",l:"1º",c:"#f0c040"},{k:"segundo",l:"2º",c:"#4fc3f7"},{k:"terceiro",l:"3º",c:"#00e676"}].map(({k,l,c})=>(
            <div key={k} className="pos-badge" style={{background:g[k]?`${c}18`:"rgba(255,255,255,.04)",borderColor:g[k]?c+"55":"rgba(255,255,255,.08)"}}>
              <div style={{color:g[k]?c:"var(--muted)"}}>{l}</div>
              <div style={{color:g[k]?"#fff":"rgba(255,255,255,.15)"}}>{g[k]?g[k].split(" ")[0]:"—"}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="hint-box">
        <strong>1º toque</strong> = 1º lugar &nbsp;·&nbsp; <strong>2º</strong> = 2º (passam direto) &nbsp;·&nbsp; <strong>3º</strong> = candidato a melhor 3º. Toque novamente para desmarcar.
      </div>
      <div className="team-list">
        {times.map(t => (
          <button key={t} className={`team-btn ${cls(t)}`} onClick={() => click(t)}>
            <span>{t}</span>
            {lbl(t) && <span className="team-badge">{lbl(t)}</span>}
          </button>
        ))}
      </div>
      <div className="btn-row">
        {etapa > 0 && <button className="btn-ghost" onClick={onBack}>← VOLTAR</button>}
        <button className="btn-gold flex2" disabled={!ok} onClick={onNext}>
          {etapa===11?"MELHORES TERCEIROS →":"PRÓXIMO →"}
        </button>
      </div>
      {!ok && <p className="hint-small">Escolha 1º e 2º para continuar</p>}
    </div>
  );
}

// ─── TERCEIROS STEP ────────────────────────────────────────────────
function TerceirosStep({grupos, terceiros, onToggle, onNext, onBack}) {
  const cands = GK.map(g => grupos[g]?.terceiro).filter(Boolean);
  const ok = terceiros.length === 8;
  return (
    <div className="card fadein wizard-card">
      <div className="grupo-title" style={{color:"#ce93d8"}}>8 MELHORES TERCEIROS</div>
      <div className="grupo-sub">Wildcards do Round of 32</div>
      <div className="hint-box" style={{borderColor:"rgba(206,147,216,.22)",background:"rgba(206,147,216,.08)"}}>
        <span style={{color:"rgba(206,147,216,.9)"}}>8 dos 12 terceiros avançam. A ordem define os slots T1–T8 no bracket.</span>
      </div>
      <div className="counter-row">
        <span>Selecionados:</span>
        <span style={{color:ok?"#ce93d8":"var(--gold)",fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:20}}>{terceiros.length}/8 {ok&&"✓"}</span>
      </div>
      {cands.length === 0
        ? <p className="hint-small">⚠️ Volte e escolha o 3º em cada grupo.</p>
        : <div className="team-list">
            {cands.map(t => {
              const sel = terceiros.includes(t), ch = terceiros.length>=8&&!sel;
              return (
                <button key={t} className={`team-btn ${sel?"s3s":""}`} style={{opacity:ch?.45:1,cursor:ch?"not-allowed":"pointer"}} onClick={()=>!ch&&onToggle(t)}>
                  <span>{t}</span>
                  {sel ? <span style={{color:"#ce93d8",fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:12}}>#{terceiros.indexOf(t)+1}</span>
                       : <span style={{fontSize:10,color:"var(--muted)"}}>toque para selecionar</span>}
                </button>
              );
            })}
          </div>
      }
      <div className="btn-row">
        <button className="btn-ghost" onClick={onBack}>← GRUPOS</button>
        <button className="btn-gold flex2" disabled={!ok} onClick={onNext}>PRÊMIOS →</button>
      </div>
      {!ok && cands.length > 0 && <p className="hint-small">Selecione {8-terceiros.length} mais</p>}
    </div>
  );
}

// ─── PRÊMIOS STEP ──────────────────────────────────────────────────
function PremiosStep({premios, onSet, onNext, onBack}) {
  return (
    <div className="fadein section">
      <div className="card" style={{padding:"13px 15px",marginBottom:11}}>
        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
          <Tag t="Prêmios"/>
          <h2 style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:19,color:"#f48fb1",letterSpacing:".1em"}}>PRÊMIOS INDIVIDUAIS</h2>
        </div>
        <p style={{color:"var(--muted)",fontSize:11,lineHeight:1.5,margin:0}}>Único a acertar = pontos <strong style={{color:"#f48fb1"}}>dobrados</strong>!</p>
      </div>
      {PREMIOS.map(({id,label,icon,pts,desc,ph}) => (
        <div key={id} className="card" style={{padding:13,marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{fontSize:22}}>{icon}</span>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:15,color:"#f48fb1",letterSpacing:".08em",lineHeight:1}}>{label}</div>
              <div style={{fontSize:10,color:"var(--muted)",fontFamily:"'Barlow Condensed',sans-serif",marginTop:1}}>{desc}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:17,color:"#f0c040",lineHeight:1}}>+{pts}</div>
              <div style={{fontSize:9,color:"rgba(244,143,177,.6)",fontFamily:"'Barlow Condensed',sans-serif"}}>pts (×2 solo)</div>
            </div>
          </div>
          <input className="field" style={{borderColor:"rgba(244,143,177,.28)",fontSize:14,padding:"9px 13px"}} placeholder={ph} value={premios[id]||""} onChange={e=>onSet(id,e.target.value)}/>
          {premios[id] && <div style={{marginTop:4,fontSize:10,color:"rgba(244,143,177,.7)"}}>✓ Solo = +{pts*2} pts</div>}
        </div>
      ))}
      <div className="btn-row">
        <button className="btn-ghost" onClick={onBack}>← TERCEIROS</button>
        <button className="btn-gold flex2" onClick={onNext}>BRACKET →</button>
      </div>
    </div>
  );
}

// ─── BRACKET ───────────────────────────────────────────────────────
function Bracket({palpite, onPick, onCampeao, onBack, onFinalizar, resultados, rdOnly}) {
  const {grupos, terceiros=[], bracket} = palpite;
  const res = (code) => {
    if(!code) return null;
    const m = code.match(/^([12])([A-L])$/);
    if(m) return grupos[m[2]]?.[m[1]==="1"?"primeiro":"segundo"]||null;
    const t = code.match(/^T(\d+)$/);
    if(t) return terceiros[parseInt(t[1])-1]||null;
    return code;
  };
  const r32d = R32.map(d=>({...d,tA:res(d.a),tB:res(d.b),venc:bracket.r32[d.id]}));
  const oitd = OIT.map(([ja,jb],i)=>({i,tA:bracket.r32[ja]||null,tB:bracket.r32[jb]||null,venc:bracket.oitavas[i],label:`O${i+1}`}));
  const quad = QUAR.map(([oa,ob],i)=>({i,tA:bracket.oitavas[oa]||null,tB:bracket.oitavas[ob]||null,venc:bracket.quartas[i],label:`Q${i+1}`}));
  const semd = SEMI.map(([qa,qb],i)=>({i,tA:bracket.quartas[qa]||null,tB:bracket.quartas[qb]||null,venc:bracket.semi[i],label:i===0?"SF1":"SF2"}));
  const H=48, HO=H*2, HQ=H*4, HS=H*8;

  const MS = ({match, fase, idx}) => {
    const {tA,tB,venc,m,date,a,b} = match;
    const pf = fase==="r32"?"r32":fase==="oit"?"oitavas":fase==="quar"?"quartas":"semi";
    const rv = resultados?.bracket?.[pf]?.[idx];
    return (
      <div>
        <div className="match-label">{m||match.label}{date?` · ${date}`:""}</div>
        <div className={`bk-m${(tA||tB)?" act":""}`}>
          {[[tA,a],[tB,b]].map(([t,code],ti) => {
            const isRW=rv&&rv===t, isMW=venc===t&&!rv;
            return (
              <div key={ti}>
                {ti===1 && <div className="bk-div"/>}
                <button className={`bk-t${isRW?" rw":isMW?" w":!t?" e":""}`} disabled={!t||rdOnly} onClick={()=>!rdOnly&&t&&onPick(pf,idx,t)}>
                  <span style={{fontSize:12,flexShrink:0}}>{t?fl(t):"—"}</span>
                  <span className="bk-name">{t?nm(t):(!tA&&!tB?code:"aguard...")}</span>
                  {(isRW||isMW) && <span style={{fontSize:8,flexShrink:0}}>{isRW?"✓":"·"}</span>}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const Col = ({items,fase,si,cW,hS,label,lc}) => (
    <div style={{width:cW,flexShrink:0}}>
      <div className="bk-lbl" style={{color:lc}}>{label}</div>
      <div>
        {items.map((m,i) => (
          <div key={i} style={{height:hS,display:"flex",flexDirection:"column",justifyContent:"center",padding:"2px 0"}}>
            <MS match={m} fase={fase} idx={si+i}/>
          </div>
        ))}
      </div>
    </div>
  );

  const Cn = (h,pairs) => (
    <svg width="13" height={h} style={{flexShrink:0,alignSelf:"flex-start",marginTop:25,overflow:"visible"}}>
      {pairs.map(([y1,y2],i)=>(
        <path key={i} d={`M0,${y1} L6,${y1} L6,${y2} L13,${y2}`} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="1"/>
      ))}
    </svg>
  );

  const cRO = [0,1,2,3].map(i=>([H*(i*2)+H/2, HO*i+HO/2]));
  const cOQ = [0,1].map(i=>([HO*(i*2)+HO/2, HQ*i+HQ/2]));
  const cQS = [[HQ/2, HS/2]];

  return (
    <div className="fadein" style={{paddingBottom:20}}>
      {!rdOnly && (
        <div className="section">
          <div className="card" style={{padding:"11px 14px"}}>
            <h2 style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:18,color:"#f0c040",letterSpacing:".1em",marginBottom:3}}>🏟️ BRACKET OFICIAL M73–M88</h2>
            <p style={{color:"var(--muted)",fontSize:11,lineHeight:1.5}}>Role para o lado · Toque no vencedor · Resultados reais em verde ✓</p>
          </div>
        </div>
      )}
      <div className="bk-wrap">
        <div className="bk">
          <Col items={r32d.slice(0,8)} fase="r32" si={0} cW={124} hS={H} label="R32 M73–M80" lc="#ce93d8"/>
          {Cn(H*8,cRO)}
          <Col items={oitd.slice(0,4)} fase="oit" si={0} cW={122} hS={HO} label="OITAVAS" lc="#80cbc4"/>
          {Cn(HO*4,cOQ)}
          <Col items={quad.slice(0,2)} fase="quar" si={0} cW={122} hS={HQ} label="QUARTAS" lc="#ffb74d"/>
          {Cn(HQ*2,cQS)}
          <Col items={semd.slice(0,1)} fase="semi" si={0} cW={122} hS={HS} label="SEMI" lc="#ffd54f"/>
          <svg width="11" height={HS} style={{flexShrink:0,alignSelf:"flex-start",marginTop:25}}><path d={`M0,${HS/2} L11,${HS/2}`} fill="none" stroke="rgba(240,192,64,.4)" strokeWidth="1.5"/></svg>
          {/* FINAL */}
          <div style={{flexShrink:0,width:90,display:"flex",flexDirection:"column",alignItems:"center",paddingTop:25}}>
            <div style={{fontSize:9,color:"var(--gold)",fontFamily:"'Bebas Neue',Impact,sans-serif",letterSpacing:".12em",marginBottom:6,textAlign:"center"}}>FINAL</div>
            <div style={{height:HS,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",width:"100%"}}>
              <div className="final-box">
                <div style={{fontSize:22,marginBottom:2,filter:"drop-shadow(0 0 10px rgba(240,192,64,.7))"}}>🏆</div>
                <div style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:8,color:"rgba(240,192,64,.65)",letterSpacing:".14em",marginBottom:6}}>CAMPEÃO</div>
                {[bracket.semi[0]||null,bracket.semi[1]||null].map((t,ti) => {
                  const isRC = resultados?.bracket?.campeao===t;
                  return (
                    <button key={ti} className={`final-team-btn ${bracket.campeao===t?(isRC?"rw":"w"):""}`} disabled={!t||rdOnly} onClick={()=>!rdOnly&&t&&onCampeao(t)}>
                      <span>{t?fl(t):"—"}</span>
                      <span>{t?nm(t):(ti===0?"F1":"F2")}</span>
                      {bracket.campeao===t && <span>{isRC?"✓":"🏆"}</span>}
                    </button>
                  );
                })}
                {bracket.campeao && <div className="final-winner">{fl(bracket.campeao)} {nm(bracket.campeao)}</div>}
                <div style={{marginTop:4,fontSize:8,color:"rgba(255,255,255,.25)",fontFamily:"'Barlow Condensed',sans-serif"}}>19 JUL · NY</div>
              </div>
            </div>
          </div>
          <svg width="11" height={HS} style={{flexShrink:0,alignSelf:"flex-start",marginTop:25}}><path d={`M0,${HS/2} L11,${HS/2}`} fill="none" stroke="rgba(240,192,64,.4)" strokeWidth="1.5"/></svg>
          <Col items={semd.slice(1,2)} fase="semi" si={1} cW={122} hS={HS} label="SEMI" lc="#ffd54f"/>
          {Cn(HQ*2,cQS)}
          <Col items={quad.slice(2,4)} fase="quar" si={2} cW={122} hS={HQ} label="QUARTAS" lc="#ffb74d"/>
          {Cn(HO*4,cOQ)}
          <Col items={oitd.slice(4,8)} fase="oit" si={4} cW={122} hS={HO} label="OITAVAS" lc="#80cbc4"/>
          {Cn(H*8,cRO)}
          <Col items={r32d.slice(8,16)} fase="r32" si={8} cW={124} hS={H} label="R32 M81–M88" lc="#ce93d8"/>
        </div>
      </div>
      <div className="progress-row">
        {[{l:"R32",d:bracket.r32.filter(Boolean).length,t:16},{l:"Oitavas",d:bracket.oitavas.filter(Boolean).length,t:8},{l:"Quartas",d:bracket.quartas.filter(Boolean).length,t:4},{l:"Semi",d:bracket.semi.filter(Boolean).length,t:2},{l:"Final",d:bracket.campeao?1:0,t:1}].map(({l,d,t}) => (
          <div key={l} className="progress-item">
            <span>{l}</span>
            <span style={{color:d===t?"#f0c040":"var(--muted)"}}>{d}/{t}</span>
          </div>
        ))}
      </div>
      {!rdOnly && (
        <div className="btn-row section">
          <button className="btn-ghost" onClick={onBack}>← PRÊMIOS</button>
          <button className="btn-gold flex2" onClick={onFinalizar}>✅ CONFIRMAR PALPITE</button>
        </div>
      )}
    </div>
  );
}

// ─── RANKING ───────────────────────────────────────────────────────
function gerarImagemBracket(palpite, pos) {
  const W = 640, H = 900;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const fl = (n) => n ? n.split(" ").slice(-1)[0] : "?";
  const nm = (n) => n ? n.split(" ").slice(0,-1).join(" ") || n : "—";
  const short = (n) => n ? `${fl(n)} ${nm(n)}` : "—";

  // Fundo gradiente
  const grad = ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,"#0a0f22"); grad.addColorStop(1,"#060914");
  ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);

  // Borda
  ctx.strokeStyle = "rgba(240,192,64,0.5)"; ctx.lineWidth = 2;
  ctx.strokeRect(8,8,W-16,H-16);

  // Linha dourada topo
  const gTop = ctx.createLinearGradient(0,0,W,0);
  gTop.addColorStop(0,"transparent"); gTop.addColorStop(0.5,"#f0c040"); gTop.addColorStop(1,"transparent");
  ctx.fillStyle = gTop; ctx.fillRect(8,8,W-16,3);

  // Título
  ctx.fillStyle = "#f0c040";
  ctx.font = "bold 36px Impact, Arial Black, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("🏆 BOLÃO COPA 2026", W/2, 58);

  // Nome + posição
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px Arial, sans-serif";
  ctx.fillText(palpite.nome, W/2, 88);
  if (pos !== undefined) {
    const medal = pos===0?"🥇":pos===1?"🥈":pos===2?"🥉":"";
    ctx.fillStyle = pos===0?"#f0c040":pos===1?"#c0c0d0":pos===2?"#c87832":"#7a8aaa";
    ctx.font = "bold 16px Arial, sans-serif";
    ctx.fillText(`${medal} ${pos+1}º lugar no ranking`, W/2, 112);
  }

  // Divisor
  const div = (y) => {
    ctx.strokeStyle = "rgba(240,192,64,0.25)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(30,y); ctx.lineTo(W-30,y); ctx.stroke();
  };
  div(125);

  // ═══ CAMPEÃO ═══
  const camp = palpite.bracket?.campeao;
  ctx.fillStyle = "rgba(240,192,64,0.12)";
  ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(30,132,W-60,58,10); else ctx.rect(30,132,W-60,58); ctx.fill();
  ctx.strokeStyle = "rgba(240,192,64,0.4)"; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = "rgba(240,192,64,0.7)"; ctx.font = "bold 12px Arial, sans-serif"; ctx.textAlign = "center";
  ctx.fillText("🏆 MEU CAMPEÃO", W/2, 150);
  ctx.fillStyle = "#ffffff"; ctx.font = "bold 26px Arial, sans-serif";
  ctx.fillText(camp ? short(camp) : "Não escolhido", W/2, 178);
  div(200);

  // ═══ FINALISTAS ═══
  const semi = palpite.bracket?.semi || [];
  ctx.fillStyle = "#ffd54f"; ctx.font = "bold 12px Arial, sans-serif"; ctx.textAlign = "center";
  ctx.fillText("🏅 FINALISTAS", W/2, 220);
  const f1 = semi[0]||null, f2 = semi[1]||null;
  // Card F1
  ctx.fillStyle = "rgba(255,213,79,0.1)";
  ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(35,228,260,36,8); else ctx.rect(35,228,260,36); ctx.fill();
  ctx.strokeStyle = "rgba(255,213,79,0.3)"; ctx.lineWidth=1; ctx.stroke();
  ctx.fillStyle = "#fff"; ctx.font = "bold 15px Arial, sans-serif"; ctx.textAlign = "center";
  ctx.fillText(f1 ? short(f1) : "—", 165, 251);
  // VS
  ctx.fillStyle = "#7a8aaa"; ctx.font = "bold 13px Arial, sans-serif";
  ctx.fillText("×", W/2, 251);
  // Card F2
  ctx.fillStyle = "rgba(255,213,79,0.1)";
  ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(345,228,260,36,8); else ctx.rect(345,228,260,36); ctx.fill();
  ctx.strokeStyle = "rgba(255,213,79,0.3)"; ctx.lineWidth=1; ctx.stroke();
  ctx.fillStyle = "#fff"; ctx.font = "bold 15px Arial, sans-serif";
  ctx.fillText(f2 ? short(f2) : "—", 475, 251);
  div(275);

  // ═══ MATA-MATA BRACKET ═══
  ctx.fillStyle = "#80cbc4"; ctx.font = "bold 12px Arial, sans-serif"; ctx.textAlign = "center";
  ctx.fillText("🏟️ CAMINHO ATÉ A FINAL", W/2, 292);

  const quartas = palpite.bracket?.quartas || [];
  const semis = palpite.bracket?.semi || [];
  const campeao = palpite.bracket?.campeao || "";

  // Helper: desenha um time num retângulo
  const drawTeam = (t, x, y, w, h, highlight) => {
    ctx.fillStyle = highlight ? "rgba(240,192,64,0.2)" : "rgba(255,255,255,0.05)";
    ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(x,y,w,h,6); else ctx.rect(x,y,w,h); ctx.fill();
    ctx.strokeStyle = highlight ? "rgba(240,192,64,0.5)" : "rgba(255,255,255,0.1)"; ctx.lineWidth=1; ctx.stroke();
    ctx.fillStyle = highlight ? "#f0c040" : "#ccd";
    ctx.font = `${highlight?"bold ":""}12px Arial, sans-serif`; ctx.textAlign = "center";
    const label = t ? `${fl(t)} ${nm(t)}` : "—";
    ctx.fillText(label, x+w/2, y+h/2+4);
  };

  // Fase labels
  const phases = [
    {label:"QUARTAS", x:30, color:"#ffb74d"},
    {label:"SEMIS", x:210, color:"#ffd54f"},
    {label:"FINAL", x:390, color:"#f0c040"},
    {label:"SEMIS", x:450, color:"#ffd54f"},
    {label:"QUARTAS", x:450, color:"#ffb74d"},
  ];

  // Quartas labels
  ctx.fillStyle = "#ffb74d"; ctx.font = "bold 10px Arial, sans-serif"; ctx.textAlign = "center";
  ctx.fillText("QUARTAS", 95, 308);
  ctx.fillText("QUARTAS", W-95, 308);
  ctx.fillStyle = "#ffd54f";
  ctx.fillText("SEMIS", 245, 308);
  ctx.fillText("SEMIS", W-245, 308);

  // Layout bracket: esquerda Q1,Q2 → SF1 | direita Q3,Q4 → SF2
  const qW = 140, qH = 28, sW = 140, sH = 28;
  const startY = 315;
  const gap = 8;

  // Quartas esquerda (Q1, Q2)
  drawTeam(quartas[0], 25, startY, qW, qH, false);
  drawTeam(quartas[1], 25, startY+qH+gap*4, qW, qH, false);

  // Semis esquerda (SF1)
  const sf1Y = startY + qH + gap*2 - sH/2 + sH/2;
  drawTeam(semis[0], 175, sf1Y, sW, sH, false);

  // Quartas direita (Q3, Q4)
  drawTeam(quartas[2], W-25-qW, startY, qW, qH, false);
  drawTeam(quartas[3], W-25-qW, startY+qH+gap*4, qW, qH, false);

  // Semis direita (SF2)
  drawTeam(semis[1], W-175-sW, sf1Y, sW, sH, false);

  // Final / Campeão
  const finW = 140, finY = sf1Y;
  drawTeam(campeao, W/2-finW/2, finY, finW, sH, true);

  // Conectores
  ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 1;
  // Q1 → SF1
  ctx.beginPath(); ctx.moveTo(25+qW, startY+qH/2); ctx.lineTo(175, sf1Y+sH/2); ctx.stroke();
  // Q2 → SF1
  ctx.beginPath(); ctx.moveTo(25+qW, startY+qH+gap*4+qH/2); ctx.lineTo(175, sf1Y+sH/2); ctx.stroke();
  // SF1 → Final
  ctx.beginPath(); ctx.moveTo(175+sW, sf1Y+sH/2); ctx.lineTo(W/2-finW/2, finY+sH/2); ctx.stroke();
  // Q3 → SF2
  ctx.beginPath(); ctx.moveTo(W-25-qW, startY+qH/2); ctx.lineTo(W-175, sf1Y+sH/2); ctx.stroke();
  // Q4 → SF2
  ctx.beginPath(); ctx.moveTo(W-25-qW, startY+qH+gap*4+qH/2); ctx.lineTo(W-175, sf1Y+sH/2); ctx.stroke();
  // SF2 → Final
  ctx.beginPath(); ctx.moveTo(W-175, sf1Y+sH/2); ctx.lineTo(W/2+finW/2, finY+sH/2); ctx.stroke();

  // Labels fases
  ctx.fillStyle = "#ffb74d"; ctx.font = "9px Arial, sans-serif"; ctx.textAlign = "center";
  ctx.fillText("Q1", 25+qW/2, startY-3);
  ctx.fillText("Q2", 25+qW/2, startY+qH+gap*4-3);
  ctx.fillText("Q3", W-25-qW/2, startY-3);
  ctx.fillText("Q4", W-25-qW/2, startY+qH+gap*4-3);
  ctx.fillStyle = "#ffd54f";
  ctx.fillText("SF1", 175+sW/2, sf1Y-3);
  ctx.fillText("SF2", W-175-sW/2, sf1Y-3);

  const bracketBottom = sf1Y + sH + 20;
  div(bracketBottom);

  // ═══ PRÊMIOS INDIVIDUAIS ═══
  const premY = bracketBottom + 15;
  ctx.fillStyle = "#f48fb1"; ctx.font = "bold 12px Arial, sans-serif"; ctx.textAlign = "center";
  ctx.fillText("🏅 PRÊMIOS INDIVIDUAIS", W/2, premY);

  const premiosData = [
    {label:"⭐ Melhor Jogador", id:"melhorJogador"},
    {label:"⚽ Artilheiro", id:"artilheiro"},
    {label:"🧤 Melhor Goleiro", id:"melhorGoleiro"},
    {label:"🎯 Maior Assistente", id:"maisPasses"},
    {label:"🌟 Melhor Jovem", id:"melhorJovem"},
  ];

  // 2 colunas
  premiosData.forEach(({label, id}, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const px = col === 0 ? 35 : W/2 + 10;
    const pw = W/2 - 45;
    const py = premY + 12 + row * 38;
    ctx.fillStyle = "rgba(244,143,177,0.08)";
    ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(px,py,pw,30,6); else ctx.rect(px,py,pw,30); ctx.fill();
    ctx.strokeStyle = "rgba(244,143,177,0.2)"; ctx.lineWidth=1; ctx.stroke();
    ctx.fillStyle = "#f48fb1"; ctx.font = "10px Arial, sans-serif"; ctx.textAlign = "left";
    ctx.fillText(label, px+8, py+12);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 12px Arial, sans-serif"; ctx.textAlign = "left";
    ctx.fillText(palpite.premios?.[id] || "—", px+8, py+26);
  });

  // Footer
  const footY = H - 28;
  div(footY - 14);
  ctx.fillStyle = "rgba(240,192,64,0.6)"; ctx.font = "11px Arial, sans-serif"; ctx.textAlign = "center";
  ctx.fillText("bolao-copa-2026-five-lilac.vercel.app", W/2, footY);
  ctx.fillStyle = "rgba(255,255,255,0.2)"; ctx.font = "10px Arial, sans-serif";
  ctx.fillText("11 JUN – 19 JUL 2026 · EUA · MÉXICO · CANADÁ", W/2, footY+14);

  return canvas.toDataURL("image/png");
}

function BotaoCompartilhar({palpite, pos}) {
  const [gerando, setGerando] = useState(false);
  const [gerado, setGerado] = useState(false);

  const compartilhar = async () => {
    setGerando(true);
    try {
      const imgData = gerarImagemBracket(palpite, pos);
      // Tenta Web Share API (funciona no mobile)
      const blob = await (await fetch(imgData)).blob();
      const file = new File([blob], "meu-bracket-copa-2026.png", {type:"image/png"});
      if (navigator.share && navigator.canShare({files:[file]})) {
        await navigator.share({
          title:"Meu Bracket Copa 2026",
          text:`Esse é o meu palpite para a Copa 2026! Faz o seu também 🏆\nbolao-copa-2026-five-lilac.vercel.app`,
          files:[file]
        });
      } else {
        // Fallback: download da imagem
        const a = document.createElement("a");
        a.href = imgData;
        a.download = `bracket-${palpite.nome}-copa2026.png`;
        a.click();
      }
      setGerado(true);
      setTimeout(()=>setGerado(false), 3000);
    } catch(e) { console.error(e); }
    setGerando(false);
  };

  return (
    <button onClick={compartilhar} disabled={gerando} style={{width:"100%",padding:"11px",background:gerado?"rgba(0,230,118,.2)":"linear-gradient(135deg,#1a3a1a,#00c853 50%,#1a3a1a)",backgroundSize:"200%",color:gerado?"#00e676":"#fff",border:`1px solid ${gerado?"#00e676":"rgba(0,200,83,.5)"}`,borderRadius:8,cursor:gerando?"wait":"pointer",fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:14,letterSpacing:".12em",transition:"all .2s",marginTop:10,display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
      {gerando ? <><div className="loader spin" style={{borderTopColor:"#fff"}}/> GERANDO IMAGEM...</>
               : gerado ? "✅ IMAGEM GERADA!"
               : "📸 COMPARTILHAR MEU BRACKET"}
    </button>
  );
}

function RankingView({partics, resultados, setAba}) {
  const [det, setDet] = useState(null);
  const [reacoes, setReacoes] = useState(getReacoes());
  const sorted = [...partics].sort((a,b)=>(b.pts||0)-(a.pts||0));
  const maxPts = Math.max(...partics.map(p=>p.pts||0), 1);

  const reagir = (nome, emoji) => {
    const novo = {...reacoes, [nome]: [...(reacoes[nome]||[]).slice(-19), {emoji, ts:Date.now()}]};
    saveReacoes(novo);
    setReacoes(novo);
  };

  return (
    <div className="fadein section">
      <div className="card" style={{padding:16,marginBottom:11}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:13}}>
          <h2 style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:20,color:"#f0c040",letterSpacing:".1em"}}>🏆 RANKING AO VIVO</h2>
          <span style={{fontSize:10,color:"var(--muted)"}}>{partics.length} participante{partics.length!==1?"s":""}</span>
        </div>
        {partics.length===0 ? (
          <div style={{textAlign:"center",padding:"22px 0"}}>
            <div style={{fontSize:38,marginBottom:7}}>⚽</div>
            <button className="btn-gold" style={{padding:"10px 20px",fontSize:13,display:"inline-block"}} onClick={()=>setAba("novo")}>FAZER MEU PALPITE</button>
          </div>
        ) : sorted.map((x,i) => (
          <div key={x.nome}>
            <div className={`rank-card ${i===0?"first":""}`} onClick={()=>setDet(det===x.nome?null:x.nome)}>
              <div className={`rank-medal ${i===0?"gold":i===1?"silver":i===2?"bronze":""}`}>
                {i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}
              </div>
              <div className="rank-info">
                <div className="rank-name">{x.nome}</div>
                <div className="rank-bar-wrap">
                  <div className="rank-bar" style={{width:`${Math.round(((x.pts||0)/maxPts)*100)}%`}}/>
                </div>
                <div className="rank-sub">{x.bracket?.campeao?`🏆 ${x.bracket.campeao}`:"—"}</div>
              </div>
              <div className="rank-pts">
                <div>{x.pts||0}</div>
                <div style={{fontSize:9,color:"var(--muted)",letterSpacing:".1em"}}>pts</div>
              </div>
            </div>
            {/* Reações */}
            {reacoes[x.nome]?.length>0 && (
              <div className="reacoes-list">
                {reacoes[x.nome].slice(-5).map((r,ri) => <span key={ri}>{r.emoji}</span>)}
              </div>
            )}
            {det===x.nome && (
              <div className="fadein card-dark" style={{padding:"10px 12px",marginBottom:8,marginTop:-4}}>
                {/* Reações */}
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:10,color:"var(--muted)",fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:".1em",marginBottom:5}}>💬 REAÇÕES</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {REACOES.map(e => (
                      <button key={e} onClick={()=>reagir(x.nome,e)} style={{fontSize:18,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,padding:"4px 8px",cursor:"pointer",transition:"transform .1s"}} onMouseDown={e=>e.currentTarget.style.transform="scale(.85)"} onMouseUp={e=>e.currentTarget.style.transform=""}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Prêmios */}
                <div style={{fontSize:10,color:"#f48fb1",fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:".1em",marginBottom:7}}>🏅 PRÊMIOS PALPITADOS</div>
                {PREMIOS.map(({id,label,icon}) => {
                  const ac = resultados?.premios?.[id] && x.premios?.[id]?.toLowerCase().trim()===resultados.premios[id]?.toLowerCase().trim();
                  return (
                    <div key={id} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
                      <span style={{fontSize:11,color:"var(--muted)"}}>{icon} {label}</span>
                      <span style={{fontSize:11,color:ac?"var(--green)":"#ccd",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:600}}>{x.premios?.[id]||"—"}{ac&&" ✓"}</span>
                    </div>
                  );
                })}
                {x.bracket?.campeao && (
                  <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:7}}>
                    <span style={{fontSize:10,background:"rgba(240,192,64,.14)",border:"1px solid rgba(240,192,64,.28)",borderRadius:6,padding:"2px 8px",color:"#f0c040",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:600}}>🏆 {x.bracket.campeao}</span>
                    {x.bracket.semi?.filter(Boolean).map(t=>(
                      <span key={t} style={{fontSize:10,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:6,padding:"2px 8px",color:"#ccd",fontFamily:"'Barlow Condensed',sans-serif"}}>{t}</span>
                    ))}
                  </div>
                )}
                <BotaoCompartilhar palpite={x} pos={sorted.indexOf(x)}/>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── HOME ──────────────────────────────────────────────────────────
function HomeView({partics, resultados, setAba, bloqueado}) {
  const [regras, setRegras] = useState(false);
  const sorted = [...partics].sort((a,b)=>(b.pts||0)-(a.pts||0));
  const lider = sorted[0];
  const maxPts = Math.max(...partics.map(p=>p.pts||0), 1);

  return (
    <div className="fadein section">
      <div className="card" style={{padding:16,marginBottom:11}}>
        <div className="stat-boxes">
          {[{icon:"⚽",val:"104",label:"JOGOS"},{icon:"🌎",val:"48",label:"SELEÇÕES"},{icon:"👥",val:partics.length||0,label:"JOGADORES"},{icon:"🏅",val:"5",label:"PRÊMIOS"}].map(({icon,val,label}) => (
            <div key={label} className="stat-box">
              <div>{icon}</div>
              <div className="stat-val">{val}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>
        {!bloqueado
          ? <button className="btn-gold" style={{width:"100%",padding:"13px",fontSize:17}} onClick={()=>setAba("novo")}>⚡ FAZER MEU PALPITE</button>
          : <div className="closed-banner">🔒 BOLÃO FECHADO — COPA EM ANDAMENTO</div>
        }
        <button className="btn-ghost" style={{width:"100%",padding:"8px",fontSize:11,marginTop:6}} onClick={()=>setRegras(v=>!v)}>
          {regras?"▲ FECHAR REGRAS":"▼ REGRAS & PONTUAÇÃO"}
        </button>
      </div>

      <LiveFeed resultados={resultados}/>

      {lider && lider.pts > 0 && (
        <div className="card shimmer" style={{padding:"13px 15px",marginBottom:11,border:"1px solid rgba(240,192,64,.38)"}}>
          <div style={{display:"flex",alignItems:"center",gap:11}}>
            <div style={{fontSize:30}}>🥇</div>
            <div style={{flex:1}}>
              <div style={{fontSize:9,color:"rgba(240,192,64,.6)",fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:".2em"}}>LIDERANDO</div>
              <div style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:20,color:"#f0c040"}}>{lider.nome}</div>
              {lider.bracket?.campeao && <div style={{fontSize:10,color:"var(--muted)"}}>🏆 {lider.bracket.campeao}</div>}
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:30,color:"#f0c040",lineHeight:1}}>{lider.pts}</div>
              <div style={{fontSize:9,color:"var(--muted)",letterSpacing:".1em"}}>PTS</div>
            </div>
          </div>
          {sorted.length > 1 && (
            <div style={{marginTop:9}}>
              {sorted.slice(0,3).map((p,i) => (
                <div key={p.nome} style={{display:"flex",alignItems:"center",gap:7,marginBottom:4}}>
                  <span style={{fontSize:11,color:"var(--muted)",width:16,fontFamily:"'Bebas Neue',Impact,sans-serif"}}>{i+1}</span>
                  <span style={{fontSize:12,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nome}</span>
                  <div style={{width:80,background:"rgba(255,255,255,.08)",borderRadius:2,overflow:"hidden"}}>
                    <div className="rank-bar" style={{width:`${Math.round(((p.pts||0)/maxPts)*100)}%`}}/>
                  </div>
                  <span style={{fontSize:11,fontFamily:"'Bebas Neue',Impact,sans-serif",color:"#f0c040",width:28,textAlign:"right"}}>{p.pts}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {regras && (
        <div className="card fadein" style={{padding:16,marginBottom:11}}>
          <h3 style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:17,color:"#f0c040",letterSpacing:".1em",marginBottom:8}}>📊 PONTUAÇÃO</h3>
          {[{f:"Classifica grupo (1º/2º)",p:3,t:"Grupos"},{f:"1º colocado exato",p:5,t:"Grupos"},{f:"3º melhor que passa",p:2,t:"Grupos"},{f:"Round of 32",p:5,t:"R32"},{f:"Oitavas",p:8,t:"Oitavas"},{f:"Quartas",p:13,t:"Quartas"},{f:"Semifinal",p:21,t:"Semi"},{f:"Finalista",p:34,t:"Final"},{f:"Campeão 🏆",p:55,t:"Final"}].map(({f,p,t}) => (
            <div key={f} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}><Tag t={t} sm/><span style={{fontSize:12,color:"#ccd"}}>{f}</span></div>
              <span style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:15,color:"#f0c040",whiteSpace:"nowrap"}}>+{p}</span>
            </div>
          ))}
          <div style={{marginTop:9,padding:"8px 10px",background:"rgba(244,143,177,.06)",borderRadius:8,border:"1px solid rgba(244,143,177,.18)"}}>
            {PREMIOS.map(({label,icon,pts}) => (
              <div key={label} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid rgba(244,143,177,.1)"}}>
                <span style={{fontSize:11,color:"#ccd"}}>{icon} {label}</span>
                <span style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:13,color:"#f48fb1"}}>+{pts} <span style={{fontSize:10,color:"rgba(244,143,177,.55)"}}>(×2 solo)</span></span>
              </div>
            ))}
          </div>
          <div style={{marginTop:8,padding:"7px 10px",background:"rgba(79,195,247,.06)",borderRadius:8,border:"1px solid rgba(79,195,247,.18)"}}>
            <p style={{fontSize:11,color:"#4fc3f7",fontFamily:"'Barlow',sans-serif",lineHeight:1.5,margin:0}}>⚡ <strong>Bônus solo:</strong> único a acertar = +50% extra automático.</p>
          </div>
        </div>
      )}

      <div className="card" style={{padding:16}}>
        <h3 style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:15,color:"#f0c040",letterSpacing:".1em",marginBottom:9}}>📅 CALENDÁRIO</h3>
        {[{f:"Fase de Grupos",d:"11–27 Jun",t:"Grupos"},{f:"Round of 32",d:"28 Jun–3 Jul",t:"R32"},{f:"Oitavas",d:"4–7 Jul",t:"Oitavas"},{f:"Quartas",d:"9–11 Jul",t:"Quartas"},{f:"Semifinais",d:"14–15 Jul",t:"Semi"},{f:"🏆 Final — MetLife, NY",d:"19 Jul",t:"Final"}].map(({f,d,t}) => (
          <div key={f} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}><Tag t={t} sm/><span style={{fontSize:12,color:"#ccd"}}>{f}</span></div>
            <span style={{fontSize:10,fontFamily:"'Barlow Condensed',sans-serif",color:"var(--muted)",whiteSpace:"nowrap"}}>{d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── NOVO ──────────────────────────────────────────────────────────
function NovoView({nome, setNome, iniciar, iniciarComFavoritos, partics, bloqueado}) {
  if (bloqueado) return (
    <div className="fadein section">
      <div className="card" style={{padding:26,textAlign:"center"}}>
        <div style={{fontSize:44,marginBottom:9}}>🔒</div>
        <h2 style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:22,color:"var(--red)",letterSpacing:".1em"}}>BOLÃO FECHADO</h2>
        <p style={{color:"var(--muted)",fontSize:12,marginTop:8,lineHeight:1.5}}>A Copa já começou. Novos palpites não são aceitos.</p>
      </div>
    </div>
  );
  return (
    <div className="fadein section">
      <div className="card" style={{padding:"22px 18px"}}>
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{fontSize:38,marginBottom:6,filter:"drop-shadow(0 0 14px rgba(240,192,64,.5))"}}>⚽</div>
          <h2 style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:24,color:"#f0c040",letterSpacing:".12em"}}>NOVO PALPITE</h2>
          <p style={{color:"var(--muted)",fontSize:12,marginTop:6,lineHeight:1.5}}>12 grupos → 8 melhores terceiros → 5 prêmios → bracket completo</p>
        </div>
        <input className="field" placeholder="Seu nome..." value={nome} onChange={e=>setNome(e.target.value)} onKeyDown={e=>e.key==="Enter"&&iniciar()} autoFocus/>
        <button className="btn-gold" style={{width:"100%",padding:"13px",fontSize:15,marginTop:10}} onClick={iniciar}>COMEÇAR DO ZERO →</button>
        <div style={{display:"flex",alignItems:"center",gap:8,margin:"10px 0"}}>
          <div style={{flex:1,height:1,background:"rgba(255,255,255,.1)"}}/>
          <span style={{fontSize:11,color:"var(--muted)",fontFamily:"'Barlow Condensed',sans-serif"}}>OU</span>
          <div style={{flex:1,height:1,background:"rgba(255,255,255,.1)"}}/>
        </div>
        <button onClick={iniciarComFavoritos} style={{width:"100%",padding:"13px",fontSize:14,background:"linear-gradient(135deg,#0d2233,#4fc3f7 50%,#0d2233)",backgroundSize:"200%",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontFamily:"'Bebas Neue',Impact,sans-serif",letterSpacing:".14em",boxShadow:"0 4px 20px rgba(79,195,247,.3)",transition:"all .2s"}}>
          ⚡ PREENCHER COM FAVORITOS
        </button>
        <div style={{marginTop:8,padding:"9px 12px",background:"rgba(79,195,247,.07)",border:"1px solid rgba(79,195,247,.2)",borderRadius:8}}>
          <p style={{fontSize:11,color:"#4fc3f7",fontFamily:"'Barlow',sans-serif",lineHeight:1.5,margin:0}}>
            🎯 <strong>Bracket automático</strong> baseado nas odds reais de hoje. Favorito vence cada jogo. Você pode editar depois!
          </p>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:6}}>
            {[["🥇 França","17%"],["🥈 Espanha","16%"],["🥉 Inglaterra","11%"],["Argentina","10%"],["Brasil","9%"]].map(([t,o])=>(
              <span key={t} style={{fontSize:10,color:"#4fc3f7",background:"rgba(79,195,247,.1)",border:"1px solid rgba(79,195,247,.2)",borderRadius:20,padding:"2px 8px",fontFamily:"'Barlow Condensed',sans-serif"}}>{t} {o}</span>
            ))}
          </div>
        </div>
        {partics.length > 0 && <p style={{textAlign:"center",color:"var(--muted)",fontSize:10,marginTop:10}}>Já participam: {partics.map(x=>x.nome).join(", ")}</p>}
      </div>
    </div>
  );
}

// ─── GRUPOS VIEW ───────────────────────────────────────────────────
function GruposView({resultados}) {
  return (
    <div className="fadein section">
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {Object.entries(GRUPOS).map(([l,times]) => {
          const rg = resultados?.grupos?.[l] || {};
          return (
            <div key={l} className="card" style={{padding:12}}>
              <div style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:19,color:"#f0c040",letterSpacing:".1em",marginBottom:8,display:"flex",alignItems:"center",gap:5}}>
                <span style={{fontSize:9,background:"rgba(240,192,64,.14)",border:"1px solid rgba(240,192,64,.28)",borderRadius:4,padding:"2px 5px"}}>GRP</span>{l}
              </div>
              {times.map((t,i) => {
                const pos = rg.primeiro===t?1:rg.segundo===t?2:rg.terceiro===t?3:null;
                return (
                  <div key={t} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 0",borderBottom:i<3?"1px solid rgba(255,255,255,.05)":"none"}}>
                    <span style={{color:"var(--muted)",fontSize:10,fontFamily:"'Bebas Neue',Impact,sans-serif",width:12}}>{i+1}</span>
                    <span style={{fontSize:12,flex:1}}>{t}</span>
                    {pos && <span style={{fontSize:9,color:pos===1?"var(--gold)":pos===2?"#4fc3f7":"#00e676",fontFamily:"'Bebas Neue',Impact,sans-serif"}}>{pos}°✓</span>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ADMIN ─────────────────────────────────────────────────────────
function AdminView({resultados, onSalvar, partics, onRecalc, onReset, onSync, syncing}) {
  const [isAuth, setAuth] = useState(false);
  const [senha, setSenha] = useState("");
  const [abaA, setAbaA] = useState("api");
  const [res, setRes] = useState(resultados || {});
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (resultados) setRes(resultados); }, [resultados]);

  const login = () => { if (senha === ADMIN_SENHA) setAuth(true); else alert("❌ Senha incorreta"); };
  const salvar = async () => {
    setSaving(true);
    await onSalvar(res);
    await onRecalc(res);
    setSaving(false);
    alert("✅ Salvo! Ranking atualizado.");
  };

  if (!isAuth) return (
    <div className="fadein section">
      <div className="card" style={{padding:"24px 18px",textAlign:"center"}}>
        <div style={{fontSize:38,marginBottom:7}}>🔐</div>
        <h2 style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:22,color:"var(--orange)",letterSpacing:".1em",marginBottom:5}}>ÁREA DO ADMIN</h2>
        <p style={{color:"var(--muted)",fontSize:11,marginBottom:14,lineHeight:1.5}}>Resultados sincronizados automaticamente pela API-Football em tempo real.</p>
        <input className="field" style={{borderColor:"rgba(255,112,67,.28)",marginBottom:7}} type="password" placeholder="Senha do admin..." value={senha} onChange={e=>setSenha(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} autoFocus/>
        <button className="btn-orange" style={{width:"100%",padding:"12px",fontSize:14}} onClick={login}>ENTRAR →</button>
      </div>
    </div>
  );

  return (
    <div className="fadein section">
      <div className="card" style={{padding:"12px 14px",marginBottom:11,border:"1px solid rgba(255,112,67,.28)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:17,color:"var(--orange)",letterSpacing:".1em"}}>🔐 PAINEL ADMIN</div>
            <div style={{fontSize:10,color:"var(--muted)",marginTop:1}}>{partics.length} participantes · API-Football ativa</div>
          </div>
          <button className="btn-gold" style={{padding:"8px 14px",fontSize:12}} onClick={salvar} disabled={saving}>{saving?"...":"💾 SALVAR"}</button>
        </div>
      </div>

      <div className="admin-tabs">
        {[{id:"api",l:"🔴 AO VIVO"},{id:"grupos",l:"⚽"},{id:"bracket",l:"🏟️"},{id:"premios",l:"🏅"},{id:"pessoas",l:"👥"}].map(({id,l}) => (
          <button key={id} className={`admin-tab ${abaA===id?"active":""}`} onClick={()=>setAbaA(id)}>{l}</button>
        ))}
      </div>

      {abaA==="api" && (
        <div className="fadein card" style={{padding:16,marginBottom:10}}>
          <h3 style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:14,color:"var(--green)",letterSpacing:".1em",marginBottom:8}}>🔴 API-FOOTBALL — AO VIVO</h3>
          <p style={{fontSize:12,color:"var(--muted)",lineHeight:1.6,marginBottom:12}}>
            Sincroniza automaticamente a cada <strong style={{color:"#ccd"}}>2 minutos</strong> durante jogos ao vivo e <strong style={{color:"#ccd"}}>10 minutos</strong> nos outros momentos.
          </p>
          <button className="btn-orange" style={{width:"100%",padding:"13px",fontSize:15}} onClick={onSync} disabled={syncing}>
            {syncing ? <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><div className="loader spin"/>SINCRONIZANDO...</span> : "🔴 SINCRONIZAR AGORA"}
          </button>
          {res.ultimaSync && (
            <div style={{marginTop:10,padding:"7px 11px",background:"rgba(0,230,118,.06)",border:"1px solid rgba(0,230,118,.18)",borderRadius:8}}>
              <p style={{fontSize:11,color:"var(--green)",margin:0}}>✅ Última sync: {new Date(res.ultimaSync).toLocaleString("pt-BR")}</p>
            </div>
          )}
          {res.jogosRecentes?.length > 0 && (
            <div style={{marginTop:12}}>
              <h4 style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:12,color:"var(--teal)",letterSpacing:".1em",marginBottom:7}}>ÚLTIMOS RESULTADOS</h4>
              {res.jogosRecentes.slice(0,6).map((j,i) => (
                <div key={i} style={{padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,.06)",display:"flex",gap:7,alignItems:"center"}}>
                  {j.aoVivo && <div className="live-dot pulse" style={{width:5,height:5}}/>}
                  <div>
                    <div style={{fontSize:12,color:j.aoVivo?"var(--green)":"#fff",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700}}>{j.times}</div>
                    <div style={{fontSize:10,color:"var(--muted)"}}>{j.fase}{j.data?` · ${j.data}`:""}</div>
                  </div>
                  {j.aoVivo && <span style={{fontSize:10,color:"var(--green)",fontFamily:"'Bebas Neue',Impact,sans-serif",marginLeft:"auto"}}>AO VIVO</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {abaA==="grupos" && (
        <div className="fadein">
          {GK.map(g => (
            <div key={g} className="card" style={{padding:13,marginBottom:9}}>
              <h4 style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:14,color:"#f0c040",letterSpacing:".08em",marginBottom:9}}>GRUPO {g}</h4>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                {["primeiro","segundo","terceiro"].map((pos,pi) => (
                  <div key={pos}>
                    <div style={{fontSize:9,color:"var(--muted)",fontFamily:"'Barlow Condensed',sans-serif",marginBottom:3}}>{pi===0?"1º":pi===1?"2º":"3º"}</div>
                    <select style={{width:"100%",padding:"6px 7px",background:"rgba(255,255,255,.07)",border:"1px solid rgba(240,192,64,.28)",borderRadius:7,color:"var(--text)",fontFamily:"'Barlow',sans-serif",fontSize:11,outline:"none"}}
                      value={res.grupos?.[g]?.[pos]||""} onChange={e=>setRes(r=>({...r,grupos:{...r.grupos,[g]:{...(r.grupos?.[g]||{}),[pos]:e.target.value}}}))}>
                      <option value="">—</option>
                      {GRUPOS[g].map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {abaA==="bracket" && (
        <div className="fadein">
          {[{fase:"r32",label:"Round of 32",total:16},{fase:"oitavas",label:"Oitavas",total:8},{fase:"quartas",label:"Quartas",total:4},{fase:"semi",label:"Semifinais",total:2}].map(({fase,label,total}) => {
            const arr = res.bracket?.[fase] || Array(total).fill("");
            return (
              <div key={fase} className="card" style={{padding:13,marginBottom:9}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
                  <h4 style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:13,color:"var(--orange)",letterSpacing:".08em"}}>{label}</h4>
                  <span style={{fontSize:10,color:"var(--muted)"}}>{arr.filter(Boolean).length}/{total} ✓</span>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {Array.from({length:total}).map((_,i) => (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:7}}>
                      <span style={{fontSize:10,color:"var(--muted)",fontFamily:"'Bebas Neue',Impact,sans-serif",width:20,flexShrink:0}}>J{i+1}</span>
                      <input className="field" style={{fontSize:12,padding:"7px 11px",borderColor:arr[i]?"rgba(0,230,118,.38)":"rgba(240,192,64,.2)"}}
                        placeholder={`Vencedor J${i+1}...`} value={arr[i]||""}
                        onChange={e=>{const a=[...arr];a[i]=e.target.value;setRes(r=>({...r,bracket:{...r.bracket,[fase]:a}}));}}/>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="card shimmer" style={{padding:13,marginBottom:9,border:"1px solid rgba(240,192,64,.38)"}}>
            <h4 style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:13,color:"#f0c040",letterSpacing:".08em",marginBottom:8}}>🏆 CAMPEÃO</h4>
            <input className="field" style={{fontSize:13,padding:"9px 13px",borderColor:res.bracket?.campeao?"rgba(0,230,118,.38)":"rgba(240,192,64,.28)"}}
              placeholder="Time campeão..." value={res.bracket?.campeao||""}
              onChange={e=>setRes(r=>({...r,bracket:{...r.bracket,campeao:e.target.value}}))}/>
          </div>
        </div>
      )}

      {abaA==="premios" && (
        <div className="fadein">
          {PREMIOS.map(({id,label,icon,desc}) => (
            <div key={id} className="card" style={{padding:13,marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <span style={{fontSize:20}}>{icon}</span>
                <div>
                  <div style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:13,color:"#f48fb1",letterSpacing:".08em"}}>{label}</div>
                  <div style={{fontSize:9,color:"var(--muted)",fontFamily:"'Barlow Condensed',sans-serif"}}>{desc}</div>
                </div>
              </div>
              <input className="field" style={{borderColor:"rgba(244,143,177,.28)",fontSize:13,padding:"8px 12px"}}
                placeholder={`Resultado: ${label}...`} value={res.premios?.[id]||""}
                onChange={e=>setRes(r=>({...r,premios:{...r.premios,[id]:e.target.value}}))}/>
            </div>
          ))}
        </div>
      )}

      {abaA==="pessoas" && (
        <div className="fadein">
          <div className="card" style={{padding:14,marginBottom:10}}>
            <h3 style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:14,color:"var(--orange)",letterSpacing:".1em",marginBottom:9}}>👥 {partics.length} PARTICIPANTES</h3>
            {[...partics].sort((a,b)=>(b.pts||0)-(a.pts||0)).map((x,i) => (
              <div key={x.nome} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
                <div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:14}}>{i+1}. {x.nome}</div>
                  <div style={{fontSize:9,color:"var(--muted)"}}>{new Date(x.criadoEm||0).toLocaleDateString("pt-BR")} · 🏆 {x.bracket?.campeao||"—"}</div>
                </div>
                <div style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:18,color:"#f0c040"}}>{x.pts||0}</div>
              </div>
            ))}
          </div>
          <div className="card" style={{padding:13,border:"1px solid rgba(255,82,82,.2)"}}>
            <h3 style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:13,color:"var(--red)",letterSpacing:".1em",marginBottom:8}}>⚠️ ZONA DE PERIGO</h3>
            <button className="btn-red" style={{width:"100%",padding:"11px",fontSize:13}} onClick={()=>{if(confirm("RESETAR TODOS OS PALPITES?")) onReset();}}>
              🗑️ RESETAR TODOS OS PALPITES
            </button>
          </div>
        </div>
      )}

      <div style={{position:"sticky",bottom:10,marginTop:10}}>
        <button className="btn-orange" style={{width:"100%",padding:"13px",fontSize:15}} onClick={salvar} disabled={saving}>
          {saving ? <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:7}}><div className="loader spin"/>SALVANDO...</span> : "💾 SALVAR E RECALCULAR PONTOS"}
        </button>
      </div>
    </div>
  );
}

// ─── CONFETTI ──────────────────────────────────────────────────────
function Confetti() {
  return (
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:999}}>
      {[...Array(26)].map((_,i) => (
        <div key={i} style={{position:"absolute",top:`${Math.random()*100}%`,left:`${Math.random()*100}%`,fontSize:`${13+Math.random()*15}px`,opacity:Math.random(),animation:`fadein ${.15+Math.random()*.4}s ease`}}>
          {["⭐","🏆","⚽","🎉","🥳","🔥","✨","🌟"][Math.floor(Math.random()*8)]}
        </div>
      ))}
    </div>
  );
}

// ─── APP ───────────────────────────────────────────────────────────
export default function App() {
  const [aba, setAba] = useState("home");
  const [nome, setNome] = useState("");
  const [palpite, setPalpite] = useState(null);
  const [etapa, setEtapa] = useState(0);
  const [confetti, setConfetti] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [jogosAoVivo, setJogosAoVivo] = useState([]);
  const TOTAL = 15;
  const bloqueado = new Date() >= COPA_START;

  const [palpites, setPalpitesState] = useState(() => getPalpites());
  const [resultados, setResultadosState] = useState(() => getResultados());

  const palpitesComPts = palpites.map(p => ({...p, pts: calcPts(p, resultados, palpites)}));

  const salvarPalpites = (l) => { savePalpites(l); setPalpitesState(l); };
  const salvarResultados = (r) => { saveResultados(r); setResultadosState(r); };
  const recalcular = (r) => {
    const a = palpites.map(p => ({...p, pts: calcPts(p, r, palpites)}));
    salvarPalpites(a);
  };

  // API-Football sync
  const syncAPI = useCallback(async () => {
    setSyncing(true);
    try {
      const [fixtures, liveData] = await Promise.all([
        fetchFixtures().catch(() => []),
        fetchLive().catch(() => []),
      ]);
      const all = [...fixtures, ...liveData.filter(l => !fixtures.find(f => f.fixture?.id === l.fixture?.id))];

      if (all.length > 0) {
        const proc = processFixtures(all);
        setJogosAoVivo(proc.jogosAoVivo);

        let gruposAPI = {};
        try {
          const standings = await fetchStandings();
          Object.entries(standings).forEach(([g, teams]) => {
            gruposAPI[g] = {};
            if(teams[0]) gruposAPI[g].primeiro = teams[0].nome;
            if(teams[1]) gruposAPI[g].segundo = teams[1].nome;
            if(teams[2]) gruposAPI[g].terceiro = teams[2].nome;
          });
        } catch {}

        const novo = {
          ...resultados,
          fase: getFaseAtual(all),
          grupos: Object.keys(gruposAPI).length > 0 ? gruposAPI : resultados.grupos,
          bracket: proc.bracket,
          jogosRecentes: proc.jogosRecentes,
          ultimaSync: new Date().toISOString(),
        };
        salvarResultados(novo);
        recalcular(novo);
      }
    } catch(e) { console.error("Sync error:", e); }
    setSyncing(false);
  }, [resultados, palpites]);

  // Auto-sync
  useEffect(() => {
    if (!bloqueado) return;
    syncAPI();
    const interval = jogosAoVivo.length > 0 ? 2*60*1000 : 10*60*1000;
    const t = setInterval(syncAPI, interval);
    return () => clearInterval(t);
  }, [bloqueado, jogosAoVivo.length]);

  // Bracket
  const B0 = () => ({r32:Array(16).fill(""),oitavas:Array(8).fill(""),quartas:Array(4).fill(""),semi:Array(2).fill(""),campeao:""});
  const clearDown = (b, fase, idx) => {
    const p = {r32:"oitavas",oitavas:"quartas",quartas:"semi"};
    const pf = p[fase]; if(!pf) return;
    const pi = Math.floor(idx/2);
    b[pf]=[...b[pf]]; b[pf][pi]="";
    if(pf==="semi") b.campeao="";
    clearDown(b, pf, pi);
  };
  const pickWinner = useCallback((fase,idx,time) => {
    setPalpite(prev => {
      const b = {...prev.bracket,r32:[...prev.bracket.r32],oitavas:[...prev.bracket.oitavas],quartas:[...prev.bracket.quartas],semi:[...prev.bracket.semi]};
      b[fase][idx] = b[fase][idx]===time?"":time;
      clearDown(b, fase, idx);
      return {...prev, bracket:b};
    });
  }, []);
  const pickCampeao = useCallback((t) => { setPalpite(p=>({...p,bracket:{...p.bracket,campeao:p.bracket.campeao===t?"":t}})); }, []);
  const toggleTerceiro = useCallback((t) => { setPalpite(p=>{const a=p.terceiros||[];return{...p,terceiros:a.includes(t)?a.filter(x=>x!==t):a.length<8?[...a,t]:a};}); }, []);
  const setPos = useCallback((grp,pk,val) => {
    setPalpite(p => {
      const g = {...p.grupos[grp]||{}};
      if(val) ["primeiro","segundo","terceiro"].forEach(k=>{if(g[k]===val)g[k]="";});
      g[pk]=val;
      return {...p, grupos:{...p.grupos,[grp]:g}};
    });
  }, []);
  const setPremio = useCallback((id,val) => { setPalpite(p=>({...p,premios:{...p.premios,[id]:val}})); }, []);

  const iniciar = () => {
    const n = nome.trim(); if(!n) return;
    if(palpites.find(x=>x.nome.toLowerCase()===n.toLowerCase())){alert("Nome já existe!");return;}
    setPalpite({nome:n,grupos:{},terceiros:[],premios:{},bracket:B0()});
    setEtapa(0); setAba("palpite");
  };

  const iniciarComFavoritos = () => {
    const n = nome.trim();
    if(!n){alert("Digite seu nome primeiro!");return;}
    if(palpites.find(x=>x.nome.toLowerCase()===n.toLowerCase())){alert("Nome já existe!");return;}
    const grupos = gruposFavoritos(GRUPOS);
    const terceiros = terceirosFavoritos(grupos, GK);
    const bracket = bracketFavoritos(grupos, terceiros, R32, OIT, QUAR, SEMI);
    setPalpite({nome:n,grupos,terceiros,premios:{...PREMIOS_FAVORITOS},bracket,preenchidoAutomaticamente:true});
    setEtapa(14); setAba("palpite");
  };
  const finalizar = async () => {
    const nova = [...palpites, {...palpite, pts:0, criadoEm:Date.now()}];
    salvarPalpites(nova);
    setPalpite(null); setNome("");
    setConfetti(true); setTimeout(()=>setConfetti(false), 3000);
    setAba("ranking");
  };

  const elabel = () => {
    if(etapa<12) return `GRUPO ${GK[etapa]}`;
    if(etapa===12) return "8 MELHORES TERCEIROS";
    if(etapa===13) return "PRÊMIOS INDIVIDUAIS";
    return "BRACKET";
  };

  const view = () => {
    if(aba==="home") return <HomeView partics={palpitesComPts} resultados={resultados} setAba={setAba} bloqueado={bloqueado}/>;
    if(aba==="novo"){
      if(palpite){setAba("palpite");return null;}
      return <NovoView nome={nome} setNome={setNome} iniciar={iniciar} iniciarComFavoritos={iniciarComFavoritos} partics={palpites} bloqueado={bloqueado}/>;
    }
    if(aba==="palpite"&&palpite){
      if(etapa<12) return <GrupoStep grp={GK[etapa]} grupos={palpite.grupos} onSetPos={setPos} onNext={()=>setEtapa(e=>e+1)} onBack={()=>setEtapa(e=>e-1)} etapa={etapa}/>;
      if(etapa===12) return <TerceirosStep grupos={palpite.grupos} terceiros={palpite.terceiros||[]} onToggle={toggleTerceiro} onNext={()=>setEtapa(13)} onBack={()=>setEtapa(11)}/>;
      if(etapa===13) return <PremiosStep premios={palpite.premios||{}} onSet={setPremio} onNext={()=>setEtapa(14)} onBack={()=>setEtapa(12)}/>;
      if(etapa===14) return <Bracket palpite={palpite} onPick={pickWinner} onCampeao={pickCampeao} onBack={()=>setEtapa(13)} onFinalizar={finalizar} resultados={resultados}/>;
    }
    if(aba==="ranking") return <RankingView partics={palpitesComPts} resultados={resultados} setAba={setAba}/>;
    if(aba==="grupos") return <GruposView resultados={resultados}/>;
    if(aba==="admin") return <AdminView resultados={resultados} onSalvar={salvarResultados} partics={palpitesComPts} onRecalc={recalcular} onReset={()=>salvarPalpites([])} onSync={syncAPI} syncing={syncing}/>;
    return null;
  };

  return (
    <>
      {confetti && <Confetti/>}
      <div className="app">
        <div className="bg-glow"/>
        <Hero nPartic={palpites.length} fase={resultados?.fase} syncing={syncing} jogosAoVivo={jogosAoVivo}/>
        <nav className="nav">
          {[{id:"home",l:"🏠"},{id:"novo",l:"✏️ PALPITAR"},{id:"ranking",l:"🏆 RANKING"},{id:"grupos",l:"⚽ GRUPOS"},{id:"admin",l:"🔐",admin:true}].map(({id,l,admin}) => (
            <button key={id} className={`nav-tab ${aba===id?"active":""} ${admin?"atab":""}`} onClick={()=>{if(id!=="palpite")setAba(id);}}>{l}</button>
          ))}
        </nav>
        {aba==="palpite"&&palpite&&(
          <div className="wizard-progress">
            <div className="prog">
              {Array.from({length:TOTAL}).map((_,i)=>(
                <div key={i} className="prog-d" style={{background:i<etapa?"#f0c040":i===etapa?"rgba(240,192,64,.5)":"rgba(255,255,255,.1)"}}/>
              ))}
            </div>
            <div className="wizard-label">{elabel()} · {etapa+1}/{TOTAL} · 👤 {palpite.nome}</div>
          </div>
        )}
        {bloqueado&&aba!=="palpite"&&aba!=="admin"&&(
          <div className="live-banner">
            <div className="live-dot pulse"/>
            <div>
              <div style={{fontFamily:"'Bebas Neue',Impact,sans-serif",fontSize:11,color:"var(--green)",letterSpacing:".1em"}}>COPA EM ANDAMENTO — API-FOOTBALL ATIVA</div>
              <div style={{fontSize:9,color:"var(--muted)"}}>Atualiza a cada 2min durante jogos · 10min nos outros momentos</div>
            </div>
            {syncing && <div className="loader spin" style={{marginLeft:"auto",flexShrink:0}}/>}
          </div>
        )}
        <div style={{paddingTop:2}}>{view()}</div>
        <div className="footer">BOLÃO COPA DO MUNDO 2026 · 11 JUN — 19 JUL · API-FOOTBALL</div>
      </div>
    </>
  );
}
