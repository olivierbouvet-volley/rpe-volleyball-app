/**
 * @file section-splitter.test.ts
 * @description Tests for the DVW section splitter using the real boulouris-sable.dvw fixture
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { splitSections, type DVWSections } from '../src/section-splitter';

// Load the real DVW fixture file
const FIXTURE_PATH = resolve(__dirname, '../../../fixtures/boulouris-sable.dvw');
const dvwContent = readFileSync(FIXTURE_PATH, 'utf-8');

describe('splitSections', () => {
  let sections: DVWSections;

  // Parse once for all tests
  beforeAll(() => {
    sections = splitSections(dvwContent);
  });

  it('should return all standard sections', () => {
    expect(sections).toHaveProperty('dataVolleyScout');
    expect(sections).toHaveProperty('match');
    expect(sections).toHaveProperty('more');
    expect(sections).toHaveProperty('teams');
    expect(sections).toHaveProperty('playersHome');
    expect(sections).toHaveProperty('playersAway');
    expect(sections).toHaveProperty('sets');
    expect(sections).toHaveProperty('attackCombinations');
    expect(sections).toHaveProperty('setterCalls');
    expect(sections).toHaveProperty('winningSymbols');
    expect(sections).toHaveProperty('reserve');
    expect(sections).toHaveProperty('video');
    expect(sections).toHaveProperty('scout');
  });

  it('should parse dataVolleyScout metadata correctly', () => {
    expect(sections.dataVolleyScout.length).toBeGreaterThan(0);
    // First line should contain FILEFORMAT
    expect(sections.dataVolleyScout[0]).toContain('FILEFORMAT');
  });

  it('should have exactly 2 lines in teams section', () => {
    expect(sections.teams).toHaveLength(2);
    expect(sections.teams[0]).toContain('BOULOURIS');
    expect(sections.teams[1]).toContain('SABLE');
  });

  it('should have 12 players in home team', () => {
    expect(sections.playersHome).toHaveLength(12);
    // Each player line should have the format: team;index;number;...
    sections.playersHome.forEach((line) => {
      expect(line).toMatch(/^0;/); // Home team = 0
    });
  });

  it('should have 14 players in away team', () => {
    expect(sections.playersAway).toHaveLength(14);
    // Each player line should start with team index 1
    sections.playersAway.forEach((line) => {
      expect(line).toMatch(/^1;/); // Away team = 1
    });
  });

  it('should have exactly 5 lines in sets section', () => {
    expect(sections.sets).toHaveLength(5);
    // First 3 sets were played (True), sets 4-5 were not (True;;;;;)
    expect(sections.sets[0]).toMatch(/^True;/);
    expect(sections.sets[1]).toMatch(/^True;/);
    expect(sections.sets[2]).toMatch(/^True;/);
  });

  it('should have 600+ scout lines', () => {
    expect(sections.scout.length).toBeGreaterThan(600);
    // Scout lines contain actions like *13SH+~~~16B, aP05>LUp, etc.
    const firstAction = sections.scout.find((line) => line.includes('SH+'));
    expect(firstAction).toBeDefined();
  });

  it('should parse video section correctly', () => {
    expect(sections.video.length).toBeGreaterThan(0);
    expect(sections.video[0]).toContain('Camera0=');
  });

  it('should handle attack combinations section', () => {
    expect(sections.attackCombinations.length).toBeGreaterThan(0);
    // Attack combo format: CODE;zone;side;tempo;description;;color;...
    const firstCombo = sections.attackCombinations[0];
    expect(firstCombo).toMatch(/^[A-Z0-9]{2};/); // Starts with 2-char code
  });

  it('should handle setter calls section', () => {
    expect(sections.setterCalls.length).toBeGreaterThan(0);
    // Setter call format: CODE;;description;;...
    const firstCall = sections.setterCalls[0];
    expect(firstCall).toMatch(/^K[0-9A-Z];/); // Starts with K + char
  });

  it('should gracefully ignore unknown sections like [3COMMENTS]', () => {
    // The file contains [3COMMENTS] but it should not crash the parser
    // This test passes if splitSections() runs without throwing
    expect(() => splitSections(dvwContent)).not.toThrow();
  });

  it('should handle empty sections correctly', () => {
    // [3RESERVE] is often empty — just the header, no content
    expect(sections.reserve).toEqual([]);
  });

  it('should parse match section with correct data', () => {
    expect(sections.match.length).toBeGreaterThan(0);
    // Match section format: date;time;season;team1;team2;result;...
    const matchLine = sections.match[0];
    expect(matchLine).toContain('2026'); // Year
  });

  it('should have more section with 2 lines', () => {
    expect(sections.more).toHaveLength(2);
  });
});
