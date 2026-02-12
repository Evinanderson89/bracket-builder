import { CohortType, TournamentDescriptionMode, TournamentKind } from './types';
import { getBracketGameWindow } from './bracketLogic';
import type { Cohort } from './types';

type TournamentDescriptionInput = Pick<
  Cohort,
  'tournamentKind'
  | 'type'
  | 'totalGames'
  | 'bracketStartGame'
  | 'scoreSourceCohortId'
  | 'centers'
  | 'descriptionMode'
  | 'customDescription'
>;

interface TournamentDescriptionOptions {
  scoreSourceName?: string | null;
}

function getScoringText(type: Cohort['type']): string {
  if (type === CohortType.HANDICAP) return 'Handicap is applied to each game total.';
  return 'Scratch scoring uses raw game totals.';
}

function getScoreSourceText(
  scoreSourceCohortId: string | null,
  scoreSourceName?: string | null,
): string {
  if (!scoreSourceCohortId) return 'This tournament uses its own score set.';
  if (scoreSourceName) return `Scores are shared from "${scoreSourceName}".`;
  return 'Scores are shared from another tournament score set.';
}

function getCentersText(centers: Cohort['centers']): string {
  if (!Array.isArray(centers) || centers.length === 0) {
    return 'Center not specified yet.';
  }
  if (centers.length === 1) {
    return `Center: ${centers[0].name}.`;
  }
  const visible = centers.slice(0, 2).map(center => center.name).join(', ');
  const remaining = centers.length - 2;
  if (remaining > 0) return `Centers: ${visible}, +${remaining} more.`;
  return `Centers: ${visible}.`;
}

export function getStockTournamentDescription(
  tournament: Pick<Cohort, 'tournamentKind' | 'type' | 'totalGames' | 'bracketStartGame' | 'scoreSourceCohortId' | 'centers'>,
  options: TournamentDescriptionOptions = {},
): string {
  const scoring = getScoringText(tournament.type);
  const source = getScoreSourceText(tournament.scoreSourceCohortId, options.scoreSourceName);
  const centersText = getCentersText(tournament.centers || []);

  if (tournament.tournamentKind === TournamentKind.SERIES) {
    const totalGames = Math.max(3, Math.floor(Number(tournament.totalGames) || 3));
    return `Series format: standings are based on the sum of all ${totalGames} games. ${scoring} ${source} ${centersText}`;
  }

  const { startGame, endGame } = getBracketGameWindow({
    tournamentKind: tournament.tournamentKind,
    totalGames: tournament.totalGames,
    bracketStartGame: tournament.bracketStartGame,
  });
  const totalGames = Math.max(3, Math.floor(Number(tournament.totalGames) || 3));
  const gameText = totalGames > 3
    ? `Rounds use games ${startGame}-${endGame} from a ${totalGames}-game set.`
    : 'Rounds use games 1-3.';

  return `Bracket format: single-elimination head-to-head rounds. ${gameText} ${scoring} ${source} ${centersText}`;
}

export function getTournamentDescription(
  tournament: TournamentDescriptionInput,
  options: TournamentDescriptionOptions = {},
): string {
  const custom = (tournament.customDescription || '').trim();
  if (tournament.descriptionMode === TournamentDescriptionMode.CUSTOM && custom) {
    return custom;
  }
  return getStockTournamentDescription(tournament, options);
}
