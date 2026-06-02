# 🏆 Bolão Copa 2026

Bolão profissional da Copa do Mundo 2026 com resultados ao vivo via API-Football.

## ⚡ Deploy no Vercel (15 minutos)

### 1. Fazer upload dos arquivos no GitHub

1. Acesse seu repositório: https://github.com/guihaddad7/bolao-copa-2026
2. Clique em **"uploading an existing file"** ou arraste os arquivos
3. Faça upload de todos os arquivos desta pasta

### 2. Deploy no Vercel

1. Acesse **vercel.com** e crie conta com GitHub
2. Clique **"New Project"**
3. Selecione o repositório `bolao-copa-2026`
4. Clique **Deploy** — pronto!

### 3. Configurar antes de publicar

Edite o arquivo `src/config.js`:
```js
export const ADMIN_SENHA = "suasenhasecreta"; // ← mude isso!
export const API_FOOTBALL_KEY = "c52df465f3b646b621a1fe9f93d50604"; // sua key
```

## 🎯 Funcionalidades

- ✅ 12 grupos com fase de classificação
- ✅ 8 melhores terceiros (wildcards)
- ✅ 5 prêmios individuais com bônus solo (×2)
- ✅ Bracket visual completo M73–M88
- ✅ Ranking ao vivo
- ✅ Reações no ranking (🔥😭👏)
- ✅ API-Football integrada (resultados automáticos)
- ✅ Sincronização a cada 2min durante jogos ao vivo
- ✅ Painel Admin completo com senha
- ✅ Bolão trava automaticamente quando a Copa começa

## 📊 Sistema de Pontuação

| Fase | Pontos |
|------|--------|
| Classifica grupo (1º/2º) | +3 |
| Acerta 1º colocado exato | +5 |
| 3º melhor que passa | +2 |
| Round of 32 | +5 |
| Oitavas | +8 |
| Quartas | +13 |
| Semifinal | +21 |
| Finalista | +34 |
| Campeão | +55 |
| Prêmios individuais | +10 a +15 |
| **Bônus solo** | **×1.5 ou ×2** |

## 🔐 Admin

Acesse a aba 🔐 no app e entre com a senha configurada.

- **🔴 AO VIVO**: Sincroniza com API-Football agora
- **⚽ GRUPOS**: Corrige resultados manualmente
- **🏟️ BRACKET**: Lança vencedores de cada jogo
- **🏅 PRÊMIOS**: Define vencedores dos prêmios
- **👥 PESSOAS**: Vê todos os participantes
