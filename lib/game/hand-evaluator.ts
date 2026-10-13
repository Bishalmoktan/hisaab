import { Card, HandEvaluation } from './types';
import { rankToValue } from './deck';

const VALUE_NAMES: Record<number, string> = {
  2: 'Twos',
  3: 'Threes',
  4: 'Fours',
  5: 'Fives',
  6: 'Sixes',
  7: 'Sevens',
  8: 'Eights',
  9: 'Nines',
  10: 'Tens',
  11: 'Jacks',
  12: 'Queens',
  13: 'Kings',
  14: 'Aces',
};

const SINGLE_VALUE_NAMES: Record<number, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'Jack',
  12: 'Queen',
  13: 'King',
  14: 'Ace',
};

/**
 * Checks if 3 cards form a Trail (Three of a Kind).
 */
export function isTrail(cards: Card[]): boolean {
  if (cards.length !== 3) return false;
  return cards[0].rank === cards[1].rank && cards[1].rank === cards[2].rank;
}

/**
 * Checks if 3 cards are of the same suit (Flush / Color).
 */
export function isColor(cards: Card[]): boolean {
  if (cards.length !== 3) return false;
  return cards[0].suit === cards[1].suit && cards[1].suit === cards[2].suit;
}

/**
 * Checks if 3 cards form a Sequence (Straight).
 * In TeenPatti, A-2-3 is the highest sequence, followed by A-K-Q, K-Q-J, ..., 4-3-2.
 */
export function isSequence(cards: Card[]): boolean {
  if (cards.length !== 3) return false;
  const vals = cards.map((c) => rankToValue(c.rank)).sort((a, b) => a - b);

  // Special case: A-2-3 (sorted values: 2, 3, 14)
  if (vals[0] === 2 && vals[1] === 3 && vals[2] === 14) {
    return true;
  }

  return vals[1] === vals[0] + 1 && vals[2] === vals[1] + 1;
}

/**
 * Checks if 3 cards form a Pure Sequence (Straight Flush).
 */
export function isPureSequence(cards: Card[]): boolean {
  return isColor(cards) && isSequence(cards);
}

/**
 * Checks if 3 cards contain a Pair (and not a Trail).
 */
export function isPair(cards: Card[]): boolean {
  if (cards.length !== 3 || isTrail(cards)) return false;
  return (
    cards[0].rank === cards[1].rank ||
    cards[1].rank === cards[2].rank ||
    cards[0].rank === cards[2].rank
  );
}

/**
 * Returns the tie-breaker score for a sequence.
 * In TeenPatti: A-2-3 is highest (15), A-K-Q is 2nd highest (14), K-Q-J is 13, ..., 4-3-2 is 4.
 */
export function getSequenceHighCard(cards: Card[]): number {
  const vals = cards.map((c) => rankToValue(c.rank)).sort((a, b) => a - b);
  if (vals[0] === 2 && vals[1] === 3 && vals[2] === 14) {
    return 15; // A-2-3 beats A-K-Q
  }
  return vals[2];
}

/**
 * Evaluates a 3-card TeenPatti hand and returns its rank, numerical value, tiebreakers, and description.
 */
export function evaluateHand(cards: Card[]): HandEvaluation {
  if (!cards || cards.length !== 3) {
    return {
      rank: 'high_card',
      rankValue: 1,
      highCards: [0, 0, 0],
      description: 'Invalid Hand',
    };
  }

  const sortedDesc = cards
    .map((c) => rankToValue(c.rank))
    .sort((a, b) => b - a);

  // 1. Trail (Three of a Kind)
  if (isTrail(cards)) {
    const val = sortedDesc[0];
    return {
      rank: 'trail',
      rankValue: 6,
      highCards: [val],
      description: `Trail of ${VALUE_NAMES[val]}`,
    };
  }

  // 2. Pure Sequence (Straight Flush)
  if (isPureSequence(cards)) {
    const seqScore = getSequenceHighCard(cards);
    const label =
      seqScore === 15
        ? 'A-2-3'
        : cards
            .map((c) => c.rank)
            .sort((a, b) => rankToValue(b) - rankToValue(a))
            .join('-');
    return {
      rank: 'pure_sequence',
      rankValue: 5,
      highCards: [seqScore],
      description: `Pure Sequence (${label})`,
    };
  }

  // 3. Sequence (Straight)
  if (isSequence(cards)) {
    const seqScore = getSequenceHighCard(cards);
    const label =
      seqScore === 15
        ? 'A-2-3'
        : cards
            .map((c) => c.rank)
            .sort((a, b) => rankToValue(b) - rankToValue(a))
            .join('-');
    return {
      rank: 'sequence',
      rankValue: 4,
      highCards: [seqScore],
      description: `Sequence (${label})`,
    };
  }

  // 4. Color (Flush)
  if (isColor(cards)) {
    return {
      rank: 'color',
      rankValue: 3,
      highCards: sortedDesc,
      description: `Color (${SINGLE_VALUE_NAMES[sortedDesc[0]]} High)`,
    };
  }

  // 5. Pair
  if (isPair(cards)) {
    let pairVal = sortedDesc[1]; // In a sorted 3-card array with a pair, middle element is always the pair rank
    let kicker = sortedDesc[0] === pairVal ? sortedDesc[2] : sortedDesc[0];
    return {
      rank: 'pair',
      rankValue: 2,
      highCards: [pairVal, kicker],
      description: `Pair of ${VALUE_NAMES[pairVal]}`,
    };
  }

  // 6. High Card
  return {
    rank: 'high_card',
    rankValue: 1,
    highCards: sortedDesc,
    description: `High Card ${SINGLE_VALUE_NAMES[sortedDesc[0]]}`,
  };
}

/**
 * Compares two 3-card TeenPatti hands.
 * Returns > 0 if hand1 wins, < 0 if hand2 wins, 0 if tie.
 */
export function compareHands(hand1: Card[], hand2: Card[]): number {
  const eval1 = evaluateHand(hand1);
  const eval2 = evaluateHand(hand2);

  if (eval1.rankValue !== eval2.rankValue) {
    return eval1.rankValue - eval2.rankValue;
  }

  const len = Math.max(eval1.highCards.length, eval2.highCards.length);
  for (let i = 0; i < len; i++) {
    const c1 = eval1.highCards[i] ?? 0;
    const c2 = eval2.highCards[i] ?? 0;
    if (c1 !== c2) {
      return c1 - c2;
    }
  }

  return 0;
}

/**
 * Finds the winning hand among multiple players.
 */
export function findWinner(
  hands: { userId: string; cards: Card[] }[]
): { userId: string; cards: Card[]; evaluation: HandEvaluation } {
  if (hands.length === 0) {
    throw new Error('No hands provided to findWinner');
  }

  let best = hands[0];
  let bestEval = evaluateHand(best.cards);

  for (let i = 1; i < hands.length; i++) {
    const current = hands[i];
    const cmp = compareHands(current.cards, best.cards);
    if (cmp > 0) {
      best = current;
      bestEval = evaluateHand(current.cards);
    }
  }

  return {
    userId: best.userId,
    cards: best.cards,
    evaluation: bestEval,
  };
}

