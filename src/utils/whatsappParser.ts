import { Player, Position, StarRating } from '../types/society';
import { normalizeIdentifier } from './drawAlgorithm';

export interface ParsedWhatsAppPlayer {
  tempId: string;
  rawLine: string;
  name: string;
  complement: string;
  position: Position;
  rating: StarRating;
  includeInImport: boolean;
  selectedForMatch: boolean;
  matchedExistingId?: string;
}

const GOALKEEPER_SECTION_RE =
  /^(?:[\p{Emoji}\s•\-*]*)?(?:goleiros?|gol|arqueiros?)(?:\s*\(.*\))?\s*:?$/iu;
const OUTFIELD_SECTION_RE =
  /^(?:[\p{Emoji}\s•\-*]*)?(?:jogadores?(?:\s+de)?\s+linha|linha|atletas|confirmados|lista(?:\s+principal)?)(?:\s*\(.*\))?\s*:?$/iu;
const WAITING_SECTION_RE =
  /^(?:[\p{Emoji}\s•\-*]*)?(?:lista\s+de\s+espera|espera|suplentes?|reservas?|avulsos?|fora)(?:\s*\(.*\))?\s*:?$/iu;

const METADATA_LINE_RE =
  /^(?:[\p{Emoji}\s•\-*]*)?(?:local|quadra|campo|arena|endere[cç]o|hor[aá]rio|hora|data|dia|valor|pre[cç]o|pix|chave|obs|observa[cç][aã]o|link|regras?|uniforme|colete)\s*:/iu;

const NOISE_ONLY_RE =
  /^[\s\-_=*~•.|/\\⚽🥅🧤🏃📅🕒📍💰✅☑️✔️❌🔥🏆🥇🥈🥉👏🙌💪⚡]+$/u;

const PAYMENT_OR_STATUS_TOKENS = new Set([
  'pago',
  'paga',
  'ok',
  'confirmado',
  'confirmada',
  'pg',
  'pix',
  'certo',
  'dentro',
]);

export function normalizeForMatch(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function findMatchingExistingPlayer(
  name: string,
  complement: string,
  position: Position,
  existingPlayers: Player[],
  complementIsPositionHint = false
): Player | undefined {
  const normName = normalizeForMatch(name);
  const normComp = normalizeForMatch(complement);
  if (!normName) return undefined;

  // 1) Exact match on (name + complement) accent-insensitive
  const exact = existingPlayers.find(
    (p) =>
      normalizeForMatch(p.name) === normName &&
      normalizeForMatch(p.complement) === normComp
  );
  if (exact) return exact;

  // 2) Full combined identity match (e.g. "Gabriel (Silva)" vs registered "Gabriel Silva")
  if (normComp) {
    const combinedInput = normalizeForMatch(`${name} ${complement}`);
    const combinedMatch = existingPlayers.find(
      (p) =>
        normalizeForMatch(`${p.name} ${p.complement}`) === combinedInput ||
        normalizeForMatch(p.name) === combinedInput
    );
    if (combinedMatch) return combinedMatch;
  }

  // 3) If no specific complement (or complement came solely from a position tag like "(Goleiro)" / "- gol"),
  //    match by unique name or unique (name + position)
  if (!normComp || complementIsPositionHint) {
    const sameNamePlayers = existingPlayers.filter(
      (p) => normalizeForMatch(p.name) === normName
    );
    if (sameNamePlayers.length === 1) {
      return sameNamePlayers[0];
    }
    if (sameNamePlayers.length > 1) {
      const samePos = sameNamePlayers.filter((p) => p.position === position);
      if (samePos.length === 1) {
        return samePos[0];
      }
    }
  }

  return undefined;
}

function clampStarRating(val: number): StarRating {
  const clamped = Math.min(5, Math.max(0.5, Math.round(val * 2) / 2));
  return clamped as StarRating;
}

function extractRatingFromLine(text: string): {
  cleaned: string;
  rating?: StarRating;
} {
  let cleaned = text;

  // Match explicit star emojis e.g. ⭐⭐⭐⭐ or ⭐⭐⭐½
  const starEmojiMatch = cleaned.match(/((?:⭐|★)+)(½)?/u);
  if (starEmojiMatch) {
    const count =
      Array.from(starEmojiMatch[1]).length + (starEmojiMatch[2] ? 0.5 : 0);
    cleaned = cleaned.replace(starEmojiMatch[0], ' ').trim();
    return { cleaned, rating: clampStarRating(count) };
  }

  // Match numeric rating like "(4.5)", "(4,5⭐)", "4.5★", "4,5 estrelas"
  const numRatingMatch = cleaned.match(
    /(?:\(|\[)?\s*([0-5](?:[.,][05])?)\s*(?:⭐|★|estrelas?)?\s*(?:\)|\])?(?=$|\s)/iu
  );
  if (numRatingMatch) {
    const fullToken = numRatingMatch[0];
    const hasStarMarker =
      /⭐|★|estrela/iu.test(fullToken) || /^\s*[(\[]/.test(fullToken);
    const numVal = parseFloat(numRatingMatch[1].replace(',', '.'));
    if (hasStarMarker && numVal >= 0.5 && numVal <= 5) {
      cleaned = cleaned.replace(fullToken, ' ').trim();
      return { cleaned, rating: clampStarRating(numVal) };
    }
  }

  return { cleaned };
}

export function stripNonNameTokens(text: string): string {
  let s = text;

  // Strip emojis, pictographs, hearts, stars, variation selectors, ZWJ, keycaps, and Unicode symbols
  s = s.replace(
    /[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{S}\u200B-\u200D\uFE0E\uFE0F\u20E3\u{1F3FB}-\u{1F3FF}]/gu,
    ' '
  );

  // Strip all numbers/digits anywhere (e.g. "Fulano 10", "10 Sérgio", "01")
  s = s.replace(/\d+/g, ' ');

  // Strip @, #, *, _, punctuation clutter, and ordinal indicators
  s = s.replace(/[@#*_•▪▫➤➢👉°ºª№.,:;!?()[\]{}/\\|"`´~]+/g, ' ');

  // Replace standalone dashes between spaces with spaces, keep intra-word hyphens like Jean-Luc
  s = s.replace(/\s+[-–—]+\s+/g, ' ');

  // Trim leading/trailing dashes, apostrophes, and whitespace
  s = s
    .replace(/^[\s\-–—'’]+|[\s\-–—'’]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return s;
}

function cleanLinePrefixAndStatus(line: string): string {
  let s = line.trim();

  // Remove WhatsApp timestamp prefix if user copied message header e.g. "[20:15, 22/11/2026] Nome:"
  s = s.replace(
    /^\[?\d{1,2}:\d{2}(?:,\s*\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)?\]?\s*[^:]{1,35}:\s*/u,
    ''
  );

  // Strip leading keycap digit emojis (1️⃣, 2️⃣, 🔟), bullets, emojis, and numbering like "1.", "1.Nome", "01 -", "1)", "12-"
  s = s.replace(
    /^(?:(?:\d\uFE0F?\u20E3|🔟)+|[•\-*▪▫➤➢👉⚽🧤🏃✅☑️✔️🔥]+|\(?\d{1,2}\)?\s*[-.):°º]+\s*|\(?\d{1,2}\)?\s+)/u,
    ''
  );
  // Second pass in case there was emoji + numbering e.g. "✅ 1 - Gabriel"
  s = s.replace(
    /^(?:(?:\d\uFE0F?\u20E3|🔟)+|[•\-*▪▫➤➢👉⚽🧤🏃✅☑️✔️🔥]+|\(?\d{1,2}\)?\s*[-.):°º]+\s*)/u,
    ''
  );

  // Strip trailing payment/confirmation emojis or markers
  s = s.replace(/\s*(?:✅|☑️|✔️|💰|⚽|🏃|🔥|👍)+$/gu, '').trim();
  s = s.replace(/\s+-\s*(?:pago|pg|ok|confirmado)$/iu, '').trim();

  return s.trim();
}

export function parseWhatsAppList(
  rawText: string,
  existingPlayers: Player[]
): ParsedWhatsAppPlayer[] {
  const lines = rawText.split(/\r?\n/);
  let currentSectionPosition: Position = 'outfield';
  let isWaitingSection = false;
  const results: ParsedWhatsAppPlayer[] = [];

  lines.forEach((rawLine, index) => {
    const trimmed = rawLine.trim();
    if (!trimmed || NOISE_ONLY_RE.test(trimmed)) return;

    // Check section headers
    if (GOALKEEPER_SECTION_RE.test(trimmed)) {
      currentSectionPosition = 'goalkeeper';
      isWaitingSection = false;
      return;
    }
    if (OUTFIELD_SECTION_RE.test(trimmed)) {
      currentSectionPosition = 'outfield';
      isWaitingSection = false;
      return;
    }
    if (WAITING_SECTION_RE.test(trimmed)) {
      isWaitingSection = true;
      return;
    }
    if (METADATA_LINE_RE.test(trimmed)) {
      return;
    }

    // Skip obvious title lines (e.g. "FUTEBOL QUARTA 20H" or "Pelada dos amigos") if not numbered
    const startsWithNumberOrBullet = /^(?:\d{1,2}\s*[-.):°º]|\d\uFE0F?\u20E3|🔟|[-•*✅☑️✔️⚽🧤🏃])/u.test(
      trimmed
    );
    if (
      !startsWithNumberOrBullet &&
      (/(?:\b\d{1,2}h\d{0,2}\b|\b\d{1,2}\/\d{1,2}\b|\bfutebol\b|\bsociety\b|\bpelada\b|\blista\b)/iu.test(
        trimmed
      ) ||
        trimmed.endsWith(':'))
    ) {
      return;
    }

    let cleaned = cleanLinePrefixAndStatus(trimmed);
    if (!cleaned || NOISE_ONLY_RE.test(cleaned)) return;

    // Detect inline goalkeeper emoji before stripping
    const hasGkEmoji = /🧤/u.test(rawLine);

    // Extract optional rating
    const ratingExtracted = extractRatingFromLine(cleaned);
    cleaned = ratingExtracted.cleaned;

    // Detect position hints and complementary identification
    let position: Position = hasGkEmoji ? 'goalkeeper' : currentSectionPosition;
    let complement = '';
    let complementIsPositionHint = false;

    // Check parenthetical or bracketed suffix: "Gabriel (Goleiro)" or "Gabriel Silva (Canhoto)"
    const parenMatch = cleaned.match(/\(([^)]+)\)|\[([^\]]+)\]/);
    if (parenMatch) {
      const inner = (parenMatch[1] || parenMatch[2] || '').trim();
      cleaned = cleaned.replace(parenMatch[0], ' ').replace(/\s+/g, ' ').trim();
      const normInner = normalizeIdentifier(inner);

      if (/^(?:goleiro|gol|gk|arqueiro)$/i.test(normInner)) {
        position = 'goalkeeper';
        complement = 'Goleiro';
        complementIsPositionHint = true;
      } else if (/^(?:linha|jogador de linha)$/i.test(normInner)) {
        position = 'outfield';
        complement = 'Linha';
        complementIsPositionHint = true;
      } else if (!PAYMENT_OR_STATUS_TOKENS.has(normInner)) {
        const cleanComp = stripNonNameTokens(inner);
        if (cleanComp.length >= 2) {
          complement = cleanComp;
        }
      }
    }

    // Check dash suffix: "Gabriel - Goleiro" or "Pedro - Volante"
    const dashParts = cleaned.split(/\s+[-–]\s+/);
    if (dashParts.length >= 2) {
      const tail = dashParts[dashParts.length - 1].trim();
      const normTail = normalizeIdentifier(tail);
      const head = dashParts.slice(0, -1).join(' - ').trim();

      if (/^(?:goleiro|gol|gk|arqueiro)$/i.test(normTail)) {
        position = 'goalkeeper';
        if (!complement) {
          complement = 'Goleiro';
          complementIsPositionHint = true;
        }
        cleaned = head;
      } else if (/^(?:linha|jogador de linha)$/i.test(normTail)) {
        position = 'outfield';
        if (!complement) {
          complement = 'Linha';
          complementIsPositionHint = true;
        }
        cleaned = head;
      } else if (PAYMENT_OR_STATUS_TOKENS.has(normTail)) {
        cleaned = head;
      } else if (!complement && tail.length <= 24) {
        const cleanTail = stripNonNameTokens(tail);
        if (cleanTail.length >= 2) {
          complement = cleanTail;
        }
        cleaned = head;
      }
    }

    const finalName = stripNonNameTokens(cleaned);
    const letterCount = (finalName.match(/\p{L}/gu) || []).length;
    if (!finalName || letterCount < 2) return;

    const matched = findMatchingExistingPlayer(
      finalName,
      complement,
      position,
      existingPlayers,
      complementIsPositionHint
    );

    results.push({
      tempId: `wa-${index}-${Math.random().toString(36).slice(2, 6)}`,
      rawLine: trimmed,
      name: matched ? matched.name : finalName,
      complement: matched ? matched.complement : complement,
      position: matched ? matched.position : position,
      rating: matched ? matched.rating : ratingExtracted.rating ?? 3.5,
      includeInImport: !isWaitingSection,
      selectedForMatch: !isWaitingSection,
      matchedExistingId: matched?.id,
    });
  });

  return results;
}

export const SAMPLE_WHATSAPP_LIST = `⚽ SOCIETY QUARTA-FEIRA 20H
Local: Arena Central

Goleiros:
1 - Gabriel (Goleiro)
2 - Carlos - gol

Linha:
3 - Gabriel (Linha)
4 - Gabriel Silva (Canhoto)
5 - João ✅
6 - Pedro - Volante
7 - Lucas ⭐⭐⭐⭐
8 - Rafael (4.5⭐)
9 - Bruno - Fixo
10 - Marcos
11 - Felipe - Ala
12 - André

Lista de espera:
13 - Thiago`;
