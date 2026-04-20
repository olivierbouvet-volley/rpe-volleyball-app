/**
 * @file sections.test.ts
 * @description Comprehensive tests for all section parsers using the real boulouris-sable.dvw fixture
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { splitSections } from '../src/section-splitter';
import { parseHeader, parseMatchInfo } from '../src/sections/header';
import { parseTeams, parsePlayers } from '../src/sections/teams';
import { parseSets } from '../src/sections/sets';
import { parseAttackCombinations } from '../src/sections/attack-combos';
import { parseSetterCalls } from '../src/sections/setter-calls';
import { parseVideoPath } from '../src/sections/video';

// Load the real DVW fixture file
const FIXTURE_PATH = resolve(__dirname, '../../../fixtures/boulouris-sable.dvw');
const dvwContent = readFileSync(FIXTURE_PATH, 'utf-8');
const sections = splitSections(dvwContent);

describe('Header parsers', () => {
  it('parseHeader retourne la version 2.0', () => {
    const header = parseHeader(sections.dataVolleyScout);
    expect(header.fileFormat).toBe('2.0');
  });

  it('parseHeader retourne le software complet', () => {
    const header = parseHeader(sections.dataVolleyScout);
    expect(header.software).toContain('Data Volley');
    expect(header.software).toContain('Professional');
    expect(header.software).toContain('Release');
  });

  it('parseHeader retourne l\'éditeur FFVB', () => {
    const header = parseHeader(sections.dataVolleyScout);
    expect(header.editor).toBe('FEDERATION FRANCAISE DE VOLLEYBALL');
  });

  it('parseMatchInfo retourne la date 2026-01-27 et INTERPOLE SUD', () => {
    const matchInfo = parseMatchInfo(sections.match);
    expect(matchInfo.date).toBe('2026-01-27');
    expect(matchInfo.competition).toBe('INTERPOLE SUD');
  });

  it('parseMatchInfo retourne la saison', () => {
    const matchInfo = parseMatchInfo(sections.match);
    expect(matchInfo.season).toBe('2015/2016');
  });
});

describe('Team parsers', () => {
  it('parseTeams retourne POLE BOULOURIS et POLE SABLE', () => {
    const { home, away } = parseTeams(sections.teams);
    expect(home.name).toBe('POLE BOULOURIS');
    expect(away.name).toBe('POLE SABLE');
  });

  it('parseTeams retourne les codes BOU et SAB', () => {
    const { home, away } = parseTeams(sections.teams);
    expect(home.code).toBe('BOU');
    expect(away.code).toBe('SAB');
  });

  it('parseTeams retourne les coachs VIAL FABRICE et BOUVET OLIVIER', () => {
    const { home, away } = parseTeams(sections.teams);
    expect(home.coach).toBe('VIAL FABRICE');
    expect(away.coach).toBe('BOUVET OLIVIER');
  });

  it('parseTeams retourne le coach adjoint de Boulouris', () => {
    const { home } = parseTeams(sections.teams);
    expect(home.assistantCoach).toBe('LAVAL LAURENT');
  });

  it('parseTeams retourne pas de coach adjoint pour Sablé', () => {
    const { away } = parseTeams(sections.teams);
    expect(away.assistantCoach).toBeUndefined();
  });
});

describe('Player parsers', () => {
  it('parsePlayers home retourne 12 joueurs', () => {
    const players = parsePlayers(sections.playersHome, 'home');
    expect(players).toHaveLength(12);
  });

  it('parsePlayers away retourne 14 joueurs', () => {
    const players = parsePlayers(sections.playersAway, 'away');
    expect(players).toHaveLength(14);
  });

  it('joueur #30 Vial Lycia est libéro', () => {
    const players = parsePlayers(sections.playersHome, 'home');
    const vial = players.find(p => p.number === 30);
    expect(vial).toBeDefined();
    expect(vial?.lastName).toBe('VIAL');
    expect(vial?.firstName).toBe('LYCIA');
    expect(vial?.isLibero).toBe(true);
    expect(vial?.position).toBe('LIB');
  });

  it('joueur #2 Zimaglia Mélina (away) est libéro', () => {
    const players = parsePlayers(sections.playersAway, 'away');
    const zimaglia = players.find(p => p.number === 2);
    expect(zimaglia).toBeDefined();
    expect(zimaglia?.lastName).toBe('ZIMAGLIA');
    expect(zimaglia?.firstName).toBe('MELINA');
    expect(zimaglia?.isLibero).toBe(true);
  });

  it('joueur #7 (away) est Prou Julia', () => {
    const players = parsePlayers(sections.playersAway, 'away');
    const prou = players.find(p => p.number === 7);
    expect(prou).toBeDefined();
    expect(prou?.lastName).toBe('PROU');
    expect(prou?.firstName).toBe('JULIA');
    expect(prou?.id).toBe('away-7');
  });

  it('chaque joueur a un id unique au format side-number', () => {
    const homePlayers = parsePlayers(sections.playersHome, 'home');
    const awayPlayers = parsePlayers(sections.playersAway, 'away');
    
    homePlayers.forEach(p => {
      expect(p.id).toMatch(/^home-\d+$/);
    });
    
    awayPlayers.forEach(p => {
      expect(p.id).toMatch(/^away-\d+$/);
    });
  });
});

describe('Set parsers', () => {
  it('parseSets retourne 3 sets joués', () => {
    const sets = parseSets(sections.sets);
    expect(sets).toHaveLength(3);
  });

  it('set 1 score final 25-20', () => {
    const sets = parseSets(sections.sets);
    const set1 = sets[0];
    expect(set1.number).toBe(1);
    expect(set1.homeScore).toBe(25);
    expect(set1.awayScore).toBe(20);
    expect(set1.winner).toBe('home');
  });

  it('set 2 score final 25-20', () => {
    const sets = parseSets(sections.sets);
    const set2 = sets[1];
    expect(set2.number).toBe(2);
    expect(set2.homeScore).toBe(25);
    expect(set2.awayScore).toBe(20);
    expect(set2.winner).toBe('home');
  });

  it('set 3 score final 15-7', () => {
    const sets = parseSets(sections.sets);
    const set3 = sets[2];
    expect(set3.number).toBe(3);
    expect(set3.homeScore).toBe(15);
    expect(set3.awayScore).toBe(7);
    expect(set3.winner).toBe('home');
  });

  it('chaque set a un tableau rallies vide (sera rempli plus tard)', () => {
    const sets = parseSets(sections.sets);
    sets.forEach(set => {
      expect(set.rallies).toEqual([]);
    });
  });

  it('les sets ont des scores partiels', () => {
    const sets = parseSets(sections.sets);
    const set1 = sets[0];
    expect(set1.partialScores?.at8).toBeDefined();
    expect(set1.partialScores?.at16).toBeDefined();
  });
});

describe('Attack combination parsers', () => {
  it('parseAttackCombinations retourne 20+ codes', () => {
    const combos = parseAttackCombinations(sections.attackCombinations);
    expect(combos.length).toBeGreaterThanOrEqual(20);
  });

  it('combo CA a startZone=3, side=L, tempo=Q', () => {
    const combos = parseAttackCombinations(sections.attackCombinations);
    const ca = combos.find(c => c.code === 'CA');
    expect(ca).toBeDefined();
    expect(ca?.startZone).toBe(3);
    expect(ca?.side).toBe('L');
    expect(ca?.tempo).toBe('Q');
  });

  it('combo Z1 a positionCategory=P (pipe)', () => {
    const combos = parseAttackCombinations(sections.attackCombinations);
    const z1 = combos.find(c => c.code === 'Z1');
    expect(z1).toBeDefined();
    expect(z1?.positionCategory).toBe('P');
  });

  it('combo V5 a les bonnes propriétés', () => {
    const combos = parseAttackCombinations(sections.attackCombinations);
    const v5 = combos.find(c => c.code === 'V5');
    expect(v5).toBeDefined();
    expect(v5?.startZone).toBe(4);
    expect(v5?.side).toBe('R');
    expect(v5?.tempo).toBe('H');
    expect(v5?.positionCategory).toBe('F');
    expect(v5?.description).toContain('4');
  });

  it('tous les combos ont un code 2 caractères', () => {
    const combos = parseAttackCombinations(sections.attackCombinations);
    combos.forEach(combo => {
      expect(combo.code).toHaveLength(2);
    });
  });
});

describe('Setter call parsers', () => {
  it('parseSetterCalls retourne plusieurs codes', () => {
    const calls = parseSetterCalls(sections.setterCalls);
    expect(calls.length).toBeGreaterThan(5);
  });

  it('les codes commencent par K', () => {
    const calls = parseSetterCalls(sections.setterCalls);
    calls.forEach(call => {
      expect(call.code).toMatch(/^K/);
    });
  });

  it('chaque call a une description', () => {
    const calls = parseSetterCalls(sections.setterCalls);
    calls.forEach(call => {
      expect(call.description).toBeTruthy();
    });
  });

  it('call K1 existe avec description', () => {
    const calls = parseSetterCalls(sections.setterCalls);
    const k1 = calls.find(c => c.code === 'K1');
    expect(k1).toBeDefined();
    expect(k1?.description).toContain('Fixe');
  });
});

describe('Video path parser', () => {
  it('parseVideoPath retourne le chemin mp4', () => {
    const path = parseVideoPath(sections.video);
    expect(path).toBeDefined();
    expect(path).toContain('.mp4');
  });

  it('le chemin contient Camera0=', () => {
    const videoLine = sections.video[0];
    expect(videoLine).toContain('Camera0=');
  });

  it('parseVideoPath extrait correctement le chemin', () => {
    const path = parseVideoPath(sections.video);
    expect(path).toMatch(/INTERPOLE.*\.mp4$/);
  });
});
