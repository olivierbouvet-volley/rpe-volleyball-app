import { describe, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseDVW } from '@volleyvision/dvw-parser';
import type { Match } from '@volleyvision/data-model';

describe('Liste des joueurs', () => {
  it('Afficher tous les joueurs', () => {
    const dvwPath = join(__dirname, '..', '..', '..', 'fixtures', 'boulouris-sable.dvw');
    const dvwContent = readFileSync(dvwPath, 'utf-8');
    const match: Match = parseDVW(dvwContent);

    console.log('\n=== ÉQUIPE HOME:', match.homeTeam.name, '===');
    match.homeTeam.players.forEach(p =>
      console.log(`  #${p.number} ${p.firstName} ${p.lastName}`)
    );

    console.log('\n=== ÉQUIPE AWAY:', match.awayTeam.name, '===');
    match.awayTeam.players.forEach(p =>
      console.log(`  #${p.number} ${p.firstName} ${p.lastName}`)
    );
  });
});
