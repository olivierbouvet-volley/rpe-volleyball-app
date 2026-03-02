import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseDVW } from '@volleyvision/dvw-parser';
import { calculatePlayerStats } from '@volleyvision/dvw-parser';
import type { Match, PlayerMatchStats } from '@volleyvision/data-model';

describe('Vérification stats Léa GUEGUEN', () => {
  const dvwPath = join(__dirname, '..', '..', '..', 'fixtures', 'boulouris-sable.dvw');
  const dvwContent = readFileSync(dvwPath, 'utf-8');
  const match: Match = parseDVW(dvwContent);
  const stats: PlayerMatchStats[] = calculatePlayerStats(match);

  // Trouver LEA GUEGUEN (#9 POLE SABLE)
  const leaStats = stats.find(s => {
    const player = [...match.homeTeam.players, ...match.awayTeam.players]
      .find(p => p.id === s.playerId);
    return player?.firstName === 'LEA' && player?.lastName === 'GUEGUEN';
  });

  it('LEA GUEGUEN existe dans les stats', () => {
    expect(leaStats).toBeDefined();
  });

  it('Service: dist.total === somme des qualités individuelles', () => {
    if (!leaStats) return;

    const serveDist = leaStats.bySkill.serve;
    if (!serveDist) return;

    const manualTotal = serveDist['#'] + serveDist['+'] + serveDist['!'] +
                        serveDist['-'] + serveDist['/'] + serveDist['='];

    console.log('Service:');
    console.log('  dist.total:', serveDist.total);
    console.log('  Somme qualités (#,+,!,-,/,=):', manualTotal);
    console.log('  Détail:', {
      '#': serveDist['#'],
      '+': serveDist['+'],
      '!': serveDist['!'],
      '-': serveDist['-'],
      '/': serveDist['/'],
      '=': serveDist['='],
    });

    expect(serveDist.total).toBe(manualTotal);
  });

  it('Réception: dist.total === somme des qualités individuelles', () => {
    if (!leaStats) return;

    const receiveDist = leaStats.bySkill.receive;
    if (!receiveDist) return;

    const manualTotal = receiveDist['#'] + receiveDist['+'] + receiveDist['!'] +
                        receiveDist['-'] + receiveDist['/'] + receiveDist['='];

    console.log('Réception:');
    console.log('  dist.total:', receiveDist.total);
    console.log('  Somme qualités:', manualTotal);

    expect(receiveDist.total).toBe(manualTotal);
  });

  it('Passe: dist.total === somme des qualités individuelles', () => {
    if (!leaStats) return;

    const setDist = leaStats.bySkill.set;
    if (!setDist) return;

    const manualTotal = setDist['#'] + setDist['+'] + setDist['!'] +
                        setDist['-'] + setDist['/'] + setDist['='];

    console.log('Passe:');
    console.log('  dist.total:', setDist.total);
    console.log('  Somme qualités:', manualTotal);

    expect(setDist.total).toBe(manualTotal);
  });

  it('Attaque: dist.total === somme des qualités individuelles', () => {
    if (!leaStats) return;

    const attackDist = leaStats.bySkill.attack;
    if (!attackDist) return;

    const manualTotal = attackDist['#'] + attackDist['+'] + attackDist['!'] +
                        attackDist['-'] + attackDist['/'] + attackDist['='];

    console.log('Attaque:');
    console.log('  dist.total:', attackDist.total);
    console.log('  Somme qualités:', manualTotal);

    expect(attackDist.total).toBe(manualTotal);
  });

  it('Block: dist.total === somme des qualités individuelles', () => {
    if (!leaStats) return;

    const blockDist = leaStats.bySkill.block;
    if (!blockDist) return;

    const manualTotal = blockDist['#'] + blockDist['+'] + blockDist['!'] +
                        blockDist['-'] + blockDist['/'] + blockDist['='];

    console.log('Block:');
    console.log('  dist.total:', blockDist.total);
    console.log('  Somme qualités:', manualTotal);

    expect(blockDist.total).toBe(manualTotal);
  });

  it('Défense: dist.total === somme des qualités individuelles', () => {
    if (!leaStats) return;

    const digDist = leaStats.bySkill.dig;
    if (!digDist) return;

    const manualTotal = digDist['#'] + digDist['+'] + digDist['!'] +
                        digDist['-'] + digDist['/'] + digDist['='];

    console.log('Défense:');
    console.log('  dist.total:', digDist.total);
    console.log('  Somme qualités:', manualTotal);

    expect(digDist.total).toBe(manualTotal);
  });

  it('Object.values() incluait bien des champs supplémentaires', () => {
    if (!leaStats) return;

    const serveDist = leaStats.bySkill.serve;
    if (!serveDist) return;

    // Ancienne méthode (INCORRECTE)
    const oldTotal = Object.values(serveDist).reduce((sum: number, count: number) => sum + count, 0);

    // Nouvelle méthode (CORRECTE)
    const newTotal = serveDist.total;

    console.log('');
    console.log('Comparaison Service (avant/après):');
    console.log('  Object.values().reduce():', oldTotal);
    console.log('  dist.total:', newTotal);
    console.log('  Différence:', oldTotal - newTotal);

    // L'ancienne méthode devrait donner un nombre plus grand
    expect(oldTotal).toBeGreaterThan(newTotal);
  });
});
