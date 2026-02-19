import { supabase } from '../supabaseClient';
import { playerToRow } from './mappers';
import type { Player } from '../types';

/**
 * Seed the database with test players.
 * All test players have names prefixed with "test_player_" for easy identification.
 * Safe to re-run — uses ON CONFLICT DO NOTHING.
 */
export async function seedTestPlayers(): Promise<void> {
  if (!supabase) {
    console.warn('[seed] No Supabase client — skipping seed.');
    return;
  }

  const testPlayers: Player[] = [
    {
      id: 'test_player_1',
      name: 'test_player_Alice',
      average: 210,
      handicap: 0,
      numBrackets: 1,
      email: 'alice@test.com',
      aliases: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'test_player_2',
      name: 'test_player_Bob',
      average: 185,
      handicap: 15,
      numBrackets: 1,
      email: 'bob@test.com',
      aliases: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'test_player_3',
      name: 'test_player_Charlie',
      average: 195,
      handicap: 5,
      numBrackets: 2,
      email: 'charlie@test.com',
      aliases: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'test_player_4',
      name: 'test_player_Diana',
      average: 220,
      handicap: 0,
      numBrackets: 1,
      email: 'diana@test.com',
      aliases: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'test_player_5',
      name: 'test_player_Evan',
      average: 170,
      handicap: 30,
      numBrackets: 1,
      email: 'evan@test.com',
      aliases: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'test_player_6',
      name: 'test_player_Fiona',
      average: 200,
      handicap: 0,
      numBrackets: 2,
      email: 'fiona@test.com',
      aliases: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'test_player_7',
      name: 'test_player_George',
      average: 190,
      handicap: 10,
      numBrackets: 1,
      email: 'george@test.com',
      aliases: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'test_player_8',
      name: 'test_player_Hannah',
      average: 205,
      handicap: 0,
      numBrackets: 1,
      email: 'hannah@test.com',
      aliases: [],
      createdAt: new Date().toISOString(),
    },
  ];

  console.log(`[seed] Inserting ${testPlayers.length} test players...`);

  for (const player of testPlayers) {
    const row = playerToRow(player);
    const { error } = await supabase
      .from('players')
      .upsert(row, { onConflict: 'id', ignoreDuplicates: true });

    if (error) {
      console.error(`[seed] Failed to insert ${player.name}:`, error.message);
    }
  }

  console.log('[seed] Test players seeded successfully.');
}

/**
 * Remove all test players (those with IDs starting with "test_player_").
 */
export async function removeTestPlayers(): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from('players')
    .delete()
    .like('id', 'test_player_%');

  if (error) {
    console.error('[seed] Failed to remove test players:', error.message);
  } else {
    console.log('[seed] Test players removed.');
  }
}
