// ============================================================================
// Pure validation for the content import pipeline (Phase 14).
//
// Content authors fill in content/template.csv; scripts/import-lessons.ts
// parses + validates it with THIS module before anything touches the
// database. Keeping the rules pure (no I/O) means every boundary is
// unit-tested — a typo'd day number is caught on the author's machine, not
// discovered as a broken unlock chain in production.
// ============================================================================

// --- Authoring limits --------------------------------------------------------
export const TITLE_MAX_LENGTH = 80; // fits one line on small phones
export const BODY_MIN_LENGTH = 50; // shorter than this isn't a lesson
export const BODY_MAX_LENGTH = 2000; // a "bite-sized" ceiling (~3 min read)
export const EST_MINUTES_MIN = 1;
export const EST_MINUTES_MAX = 60;
export const MAX_DAYS_PER_TRACK = 365;

// One row of the authoring file (CSV or JSON). Everything is a string at this
// point — validation is what turns strings into trusted, typed content.
export interface RawContentRow {
  track_slug: string;
  track_title_ar: string;
  track_title_en?: string;
  track_description_ar?: string;
  day_number: string;
  title_ar: string;
  body_ar: string;
  est_minutes?: string;
}

export interface ParsedTrack {
  slug: string;
  title_ar: string;
  title_en: string | null;
  description_ar: string | null;
}

export interface ParsedLesson {
  track_slug: string;
  day_number: number;
  title_ar: string;
  body_ar: string;
  est_minutes: number;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[]; // human-readable, each prefixed with the offending row
  tracks: ParsedTrack[];
  lessons: ParsedLesson[];
}

// Does the text contain Arabic script? (The app is Arabic-first; a lesson
// with no Arabic at all is almost certainly a copy-paste mistake.)
export function containsArabic(text: string): boolean {
  return /[؀-ۿ]/.test(text); // the Unicode "Arabic" block
}

// Slugs become URL/storage keys — lowercase ASCII only, hyphen-separated.
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}

// --- CSV parsing (RFC 4180-ish) ----------------------------------------------
// Lesson bodies contain commas and newlines, so fields must support quoting:
//   "field with, comma", "field with ""escaped"" quotes", "multi
//   line field"
// Small and dependency-free on purpose — the import script runs via npx tsx.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'; // escaped quote
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++; // CRLF
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  // Trailing field/row without a final newline.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop rows that are entirely empty (blank lines).
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

// Turn header + data rows into RawContentRow records, keyed by header names.
export function csvToRecords(cells: string[][]): RawContentRow[] {
  if (cells.length === 0) return [];
  const header = cells[0].map((h) => h.trim());
  return cells.slice(1).map((row) => {
    const rec: Record<string, string> = {};
    header.forEach((key, i) => {
      rec[key] = (row[i] ?? '').trim();
    });
    return rec as unknown as RawContentRow;
  });
}

// --- The validator ------------------------------------------------------------
// Row numbers in errors are 1-based DATA row numbers (row 1 = first lesson,
// i.e. line 2 of the CSV) so authors can find them in a spreadsheet.
export function validateContent(rows: RawContentRow[]): ValidationResult {
  const errors: string[] = [];
  const tracksBySlug = new Map<string, ParsedTrack>();
  const lessons: ParsedLesson[] = [];
  const seenDays = new Set<string>(); // "slug:day" for duplicate detection

  if (rows.length === 0) {
    return { ok: false, errors: ['no data rows found'], tracks: [], lessons: [] };
  }

  rows.forEach((row, i) => {
    const at = `row ${i + 1}`;
    const slug = row.track_slug ?? '';
    if (!isValidSlug(slug)) {
      errors.push(`${at}: track_slug "${slug}" must be lowercase-hyphenated ascii (e.g. "self-confidence")`);
    }

    // Track fields: required the first time a slug appears; later rows may
    // leave them blank (they're ignored — first occurrence wins).
    if (!tracksBySlug.has(slug)) {
      const trackTitle = row.track_title_ar ?? '';
      if (!trackTitle || !containsArabic(trackTitle)) {
        errors.push(`${at}: track_title_ar is required (in Arabic) on the first row of track "${slug}"`);
      }
      tracksBySlug.set(slug, {
        slug,
        title_ar: trackTitle,
        title_en: row.track_title_en?.trim() || null,
        description_ar: row.track_description_ar?.trim() || null,
      });
    }

    const day = Number(row.day_number);
    if (!Number.isInteger(day) || day < 1 || day > MAX_DAYS_PER_TRACK) {
      errors.push(`${at}: day_number "${row.day_number}" must be an integer 1–${MAX_DAYS_PER_TRACK}`);
    } else {
      const key = `${slug}:${day}`;
      if (seenDays.has(key)) {
        errors.push(`${at}: duplicate day ${day} in track "${slug}"`);
      }
      seenDays.add(key);
    }

    const title = row.title_ar ?? '';
    if (!title) {
      errors.push(`${at}: title_ar is required`);
    } else if (title.length > TITLE_MAX_LENGTH) {
      errors.push(`${at}: title_ar is ${title.length} chars (max ${TITLE_MAX_LENGTH})`);
    } else if (!containsArabic(title)) {
      errors.push(`${at}: title_ar contains no Arabic text`);
    }

    const body = row.body_ar ?? '';
    if (body.length < BODY_MIN_LENGTH) {
      errors.push(`${at}: body_ar is ${body.length} chars (min ${BODY_MIN_LENGTH})`);
    } else if (body.length > BODY_MAX_LENGTH) {
      errors.push(`${at}: body_ar is ${body.length} chars (max ${BODY_MAX_LENGTH})`);
    } else if (!containsArabic(body)) {
      errors.push(`${at}: body_ar contains no Arabic text`);
    }
    if (body.includes('�')) {
      errors.push(`${at}: body_ar contains the � replacement character — the file was saved with the wrong encoding (use UTF-8)`);
    }

    const estRaw = row.est_minutes?.trim();
    const est = estRaw ? Number(estRaw) : 5; // sensible default for text lessons
    if (!Number.isInteger(est) || est < EST_MINUTES_MIN || est > EST_MINUTES_MAX) {
      errors.push(`${at}: est_minutes "${estRaw}" must be an integer ${EST_MINUTES_MIN}–${EST_MINUTES_MAX}`);
    }

    lessons.push({ track_slug: slug, day_number: day, title_ar: title, body_ar: body, est_minutes: est });
  });

  // Cross-row rule: each track's days must run 1..N with no gaps — the unlock
  // chain (complete day N → unlock day N+1) breaks on a missing day.
  for (const slug of tracksBySlug.keys()) {
    const days = lessons
      .filter((l) => l.track_slug === slug && Number.isInteger(l.day_number))
      .map((l) => l.day_number)
      .sort((a, b) => a - b);
    for (let expected = 1; expected <= days.length; expected++) {
      if (days[expected - 1] !== expected) {
        errors.push(`track "${slug}": days must be contiguous starting at 1 (found ${days.join(', ')})`);
        break;
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    tracks: [...tracksBySlug.values()],
    lessons,
  };
}
