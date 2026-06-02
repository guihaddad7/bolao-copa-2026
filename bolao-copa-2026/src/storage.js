import { SK } from './config';

// Storage simples com localStorage (funciona no Vercel)
// Para escala maior, trocar por Supabase/Firebase

export const storage = {
  get: (key) => {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : null;
    } catch { return null; }
  },
  set: (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { return false; }
  },
  remove: (key) => {
    try { localStorage.removeItem(key); return true; }
    catch { return false; }
  }
};

export const getPalpites = () => storage.get(SK.palpites) || [];
export const savePalpites = (data) => storage.set(SK.palpites, data);
export const getResultados = () => storage.get(SK.resultados) || {};
export const saveResultados = (data) => storage.set(SK.resultados, data);
export const getReacoes = () => storage.get(SK.reacoes) || {};
export const saveReacoes = (data) => storage.set(SK.reacoes, data);
