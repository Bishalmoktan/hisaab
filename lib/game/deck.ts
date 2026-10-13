import { Card, Suit, Rank } from './types';

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

/**
 * Creates a standard 52-card deck.
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

/**
 * Shuffles a deck of cards using the Fisher-Yates algorithm.
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Deals cards to a given number of players.
 */
export function dealCards(
  deck: Card[],
  numPlayers: number,
  cardsPerPlayer: number = 3
): { hands: Card[][]; remainingDeck: Card[] } {
  const hands: Card[][] = Array.from({ length: numPlayers }, () => []);
  const remainingDeck = [...deck];

  for (let c = 0; c < cardsPerPlayer; c++) {
    for (let p = 0; p < numPlayers; p++) {
      const card = remainingDeck.shift();
      if (card) {
        hands[p].push(card);
      }
    }
  }

  return { hands, remainingDeck };
}

/**
 * Converts a suit to its Unicode symbol.
 */
export function suitToSymbol(suit: Suit): string {
  switch (suit) {
    case 'hearts':
      return '♥';
    case 'diamonds':
      return '♦';
    case 'clubs':
      return '♣';
    case 'spades':
      return '♠';
  }
}

/**
 * Converts a card to a display string (e.g., "A♠").
 */
export function cardToString(card: Card): string {
  return `${card.rank}${suitToSymbol(card.suit)}`;
}

/**
 * Converts a card rank to its numerical value (2=2 ... A=14).
 */
export function rankToValue(rank: Rank): number {
  switch (rank) {
    case '2':
      return 2;
    case '3':
      return 3;
    case '4':
      return 4;
    case '5':
      return 5;
    case '6':
      return 6;
    case '7':
      return 7;
    case '8':
      return 8;
    case '9':
      return 9;
    case '10':
      return 10;
    case 'J':
      return 11;
    case 'Q':
      return 12;
    case 'K':
      return 13;
    case 'A':
      return 14;
  }
}

