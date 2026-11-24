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

const NOISE_ONLY_RE = /^[\s\-_=*~•.|/\\⚽🥅🧤🏃📅🕒📍💰✅☑️✔️❌🔥🏆🥇🥈🥉👏🙌💪⚡]+$/u;

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
    const count = Array.from(starEmojiMatch[1]).length + (starEmojiMatch[2] ? 0.5 : 0);
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

function cleanLinePrefixAndStatus(line: string): string {
  let s = line.trim();

  // Remove WhatsApp timestamp prefix if user copied message header e.g. "[20:15, 22/11/2026] Nome:"
  s = s.replace(/^\[?\d{1,2}:\d{2}(?:,\s*\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)?\]?\s*[^:]{1,35}:\s*/u, '');

  // Strip leading bullets, emojis, and numbering like "1.", "01 -", "1)", "12-", "12 "
  s = s.replace(
    /^(?:[•\-*▪▫➤➢👉⚽🧤🏃✅☑️✔️🔥]+|\(?\d{1,2}\)?\s*[-.):°º]?\s+)/u,
    ''
  );
  // Second pass in case there was emoji + numbering e.g. "✅ 1 - Gabriel"
  s = s.replace(
    /^(?:[•\-*▪▫➤➢👉⚽🧤🏃✅☑️✔️🔥]+|\(?\d{1,2}\)?\s*[-.):°º]+\s*)/u,
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

    // Skip obvious title lines (e.g. "FUTEBOL QUARTA 20H" or "Pelada dos amigos") if not numbered and all-caps/contains time
    const startsWithNumberOrBullet = /^(?:\d{1,2}\s*[-.):°º]|[-•*✅☑️✔️⚽🧤🏃])/u.test(
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

    // Check parenthetical or bracketed suffix: "Gabriel (Goleiro)" or "Gabriel Silva (Canhoto)"
    const parenMatch = cleaned.match(/\(([^)]+)\)|\[([^\]]+)\]/);
    if (parenMatch) {
      const inner = (parenMatch[1] || parenMatch[2] || '').trim();
      cleaned = cleaned.replace(parenMatch[0], ' ').replace(/\s+/g, ' ').trim();
      const normInner = normalizeIdentifier(inner);

      if (/^(?:goleiro|gol|gk|arqueiro)$/i.test(normInner)) {
        position = 'goalkeeper';
        complement = 'Goleiro';
      } else if (/^(?:linha|jogador de linha)$/i.test(normInner)) {
        position = 'outfield';
        complement = 'Linha';
      } else if (!PAYMENT_OR_STATUS_TOKENS.has(normInner)) {
        complement = inner;
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
        if (!complement) complement = 'Goleiro';
        cleaned = head;
      } else if (/^(?:linha|jogador de linha)$/i.test(normTail)) {
        position = 'outfield';
        if (!complement) complement = 'Linha';
        cleaned = head;
      } else if (PAYMENT_OR_STATUS_TOKENS.has(normTail)) {
        cleaned = head;
      } else if (!complement && tail.length <= 24) {
        complement = tail;
        cleaned = head;
      }
    }

    const finalName = cleaned.replace(/\s+/g, ' ').trim();
    if (!finalName || finalName.length < 2) return;

    // Try matching existing player:
    // 1) Exact match (name + complement)
    const normName = normalizeIdentifier(finalName);
    const normComp = normalizeIdentifier(complement);

    let matched = existingPlayers.find(
      (p) =>
        normalizeIdentifier(p.name) === normName &&
        normalizeIdentifier(p.complement) === normComp
    );

    // 2) If imported line has no complement, check if there is a unique existing player with that exact name (and same position or unique overall)
    if (!matched && !normComp) {
      const sameNamePlayers = existingPlayers.filter(
        (p) => normalizeIdentifier(p.name) === normName
      );
      if (sameNamePlayers.length === 1) {
        matched = sameNamePlayers[0];
      } else if (sameNamePlayers.length > 1) {
        const samePos = sameNamePlayers.filter((p) => p.position === position);
        if (samePos.length === 1) {
          matched = samePos[0];
        }
      }
    }

    results.push({
      tempId: `wa-${index}-${Math.random().toString(36).slice(2, 6)}`,
      rawLine: trimmed,
      name: matched ? matched.name : finalName,
      complement: matched ? matched.complement : complement,
      position: matched ? matched.position : position,
      rating: matched ? matched.rating : ratingExtracted.rating ?? 3,
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
