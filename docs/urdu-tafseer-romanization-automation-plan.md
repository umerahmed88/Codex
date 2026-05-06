# Urdu Tafseer Roman Urdu DOCX Automation Plan

## Confirmed requirements

- Input files are Microsoft Word `.docx` documents.
- The output must be a `.docx` document with Roman Urdu text.
- Roman Urdu paragraphs should be left-aligned.
- Arabic and Quranic script must remain exactly unchanged, regardless of the original color.
- Original formatting should be preserved wherever possible, including font color, bold, italic, underline, font size, borders, headings, page numbers, and paragraph structure.
- Existing English words, especially parenthesized glossary words such as `(increase)`, `(growth)`, and `(goodness)`, must remain unchanged.
- Preferred Roman Urdu style is: `Allah Ta'ala ne farmaya ke...`.

## Target workflow

1. User uploads the original Urdu tafseer `.docx` file.
2. The converter creates a working copy of the uploaded document.
3. The converter reads the Word document structure, including paragraphs, runs, styles, headers, footers, and tables.
4. The converter identifies Urdu, Arabic/Quranic, English, punctuation, and numeric segments.
5. Only Urdu segments are sent for Roman Urdu conversion.
6. Arabic/Quranic script and English text are preserved exactly.
7. Roman Urdu text is inserted back into the original document structure while retaining formatting.
8. Roman Urdu paragraphs are set to left-to-right and left-aligned.
9. The converted `.docx` and a quality report are returned to the user.

## Processing architecture

```text
DOCX upload
  -> document copy
  -> DOCX parser
  -> paragraph/run extraction
  -> language and segment detector
  -> Urdu-to-Roman-Urdu transliteration service
  -> formatting-preserving DOCX writer
  -> quality checker
  -> converted DOCX + report
```

The converter should modify a copy of the source `.docx` rather than rebuilding the document from scratch. This approach gives the best chance of preserving existing colors, bold styling, borders, page numbering, and other Word formatting.

## Document parsing strategy

Word stores formatting in small text units called runs. A single paragraph can contain many runs with different colors or styles, for example:

```text
[orange heading] [black Urdu explanation] [red Arabic ayah] [bold English glossary word]
```

The converter should process each paragraph as logical text while retaining a map back to the original runs. This prevents loss of formatting when replacing Urdu script with Roman Urdu.

Recommended handling:

- Preserve existing run formatting.
- Avoid transliterating Arabic-only runs.
- Avoid changing English-only runs.
- Group adjacent Urdu runs when needed so the AI receives enough context.
- Reinsert transliterated Roman Urdu into the same logical location.
- If exact run-to-run mapping is unsafe, preserve paragraph-level styling and flag the paragraph in the quality report for review.

## Language and script detection rules

### Preserve Arabic/Quranic script

A segment should be preserved unchanged when it contains strong Arabic/Quranic indicators, including:

- Quranic diacritics such as `َ`, `ِ`, `ُ`, `ْ`, `ّ`, and `ٰ`.
- Quranic pause marks such as `ۚ`, `ۖ`, `ۗ`, `ۘ`, `ۙ`, `ۛ`, and `ۜ`.
- Arabic phrases and words commonly found in ayat, such as `الَّذِي`, `الْمُلْكُ`, `شَيْءٍ`, and `قَدِيرٌ`.
- Honorific or Islamic symbols such as `ﷺ`, `ؓ`, and `ؒ`.

Arabic text must be preserved regardless of whether it is red, blue, black, or any other color in the original document.

### Convert Urdu script

A segment should be converted to Roman Urdu when it contains Urdu-specific letters or common Urdu words, including:

```text
ٹ، ڈ، ڑ، گ، چ، پ، ژ، ے، ھ، ں
ہے، ہیں، تھا، تھی، اور، میں، کو، سے، پر، نے، کہ، جو، نہیں، بھی، یہ، وہ
```

### Preserve English text

English words, acronyms, numbers, punctuation, and parenthesized definitions must be preserved exactly. Examples:

```text
(increase)
(growth)
(goodness)
(elevation)
(stability)
Owner
control
```

## AI transliteration prompt

Use a strict prompt for the transliteration service:

```text
You are converting Urdu tafseer into Roman Urdu.

Rules:
1. Convert Urdu script into natural Roman Urdu.
2. Do not translate into English.
3. Preserve Arabic and Quranic text exactly as written.
4. Preserve English words exactly as written.
5. Preserve numbers, punctuation, brackets, parentheses, quotation marks, and symbols.
6. Preserve honorific symbols such as ﷺ, ؓ, and ؒ.
7. Do not add explanations.
8. Do not remove any content.
9. Use the Roman Urdu style: Allah Ta'ala ne farmaya ke...
10. Prefer these spellings: hai, hain, mein, ke, aur, woh, jis, hath, taake, nahi, kainat, qudrat, hikmat.
11. Keep Islamic terms consistent according to the project glossary.
```

## Starter glossary

| Urdu | Roman Urdu |
| --- | --- |
| اللہ | Allah |
| تعالیٰ | Ta'ala |
| قرآن | Quran |
| سورت | Surah |
| آیت | Ayat |
| برکت | barakat |
| کائنات | kainat |
| قدرت | qudrat |
| حکمت | hikmat |
| خیر | khair |
| عظمت | azmat |
| بلندی | bulandi |
| احسانات | ihsanat |
| مالک | malik |
| سلطنت | sultanat |
| زندگی | zindagi |
| موت | maut |
| آزمائش | azmaish |

The glossary should be editable by the team and applied before or after AI conversion to enforce consistent spellings.

## Formatting behavior

The converter should preserve original formatting unless explicitly changed by the workflow.

| Source element | Output behavior |
| --- | --- |
| Urdu tafseer | Convert to Roman Urdu and preserve formatting |
| Arabic/Quranic text | Preserve script exactly and preserve formatting |
| English glossary words | Preserve text and formatting exactly |
| Headings | Convert Urdu to Roman Urdu and preserve heading color/style |
| Page borders | Preserve |
| Page numbers | Preserve |
| Tables | Preserve table structure and process text inside cells |
| Roman Urdu paragraphs | Set to left-to-right and left-aligned |
| Arabic-only paragraphs | Preserve original alignment unless a project setting overrides it |

## Quality report

Each conversion should produce a report with at least these fields:

- Total paragraphs scanned.
- Total Urdu segments converted.
- Total Arabic/Quranic segments preserved.
- Total English segments preserved.
- Paragraphs that still contain Urdu script after conversion.
- Paragraphs where Arabic text may have been altered.
- Paragraphs with unusually long segments sent to the AI service.
- Paragraphs where formatting preservation was partial.

Example report:

```text
Conversion completed.
Paragraphs scanned: 842
Urdu segments converted: 2418
Arabic segments preserved: 394
English segments preserved: 231
Warnings: 7
```

## Implementation phases

### Phase 1: Prototype

- Build a local command-line converter for `.docx` files.
- Process paragraphs and basic runs.
- Preserve Arabic/Quranic text.
- Preserve English text.
- Convert Urdu text to Roman Urdu using an AI service.
- Preserve basic formatting.
- Save a converted `.docx` file.
- Generate a basic quality report.

### Phase 2: Web application

- Add a simple upload/download web interface.
- Add settings for alignment, glossary, and model selection.
- Add progress display for large documents.
- Add downloadable quality reports.
- Add team-friendly error messages.

### Phase 3: Production team workflow

- Add batch conversions.
- Add shared glossary management.
- Add conversion history.
- Add review mode for warnings.
- Add support for headers, footers, tables, and footnotes if not completed earlier.
- Add regression tests using approved before/after sample documents.

## Recommended technical stack

### Prototype

- Python 3.11+
- `python-docx` for initial DOCX operations
- Direct DOCX XML handling for features not exposed by `python-docx`
- Google Gemini API or another approved LLM API for Roman Urdu conversion
- `pytest` for validation tests

### Team app

- Streamlit for the first internal tool, or FastAPI plus React for a more scalable app.
- A small database or file-based store for conversion history and glossary settings.

## Validation checklist

Before a converted document is accepted, verify that:

- Arabic/Quranic text is unchanged.
- English parenthesized words are unchanged.
- The document opens correctly in Microsoft Word.
- Colors and bold formatting remain consistent with the original document.
- Roman Urdu follows the style `Allah Ta'ala ne farmaya ke...`.
- No unexpected Urdu script remains, except inside preserved Arabic/Quranic text.
- Page borders and page numbers are still present.

## If a sample DOCX cannot be attached

Development can still continue without a user-provided `.docx` file. The prototype should begin with a small synthetic `.docx` fixture that mimics the observed document structure from the screenshots. This avoids blocking implementation while the file-sharing issue is resolved.

The synthetic fixture should include:

- One orange or yellow heading containing Urdu text and ayat numbers.
- One red Arabic/Quranic ayah run with diacritics.
- One blue Arabic keyword run such as `تَبَارَكَ`.
- Multiple black Urdu tafseer paragraphs.
- Parenthesized English glossary words such as `(increase)`, `(growth)`, and `(goodness)`, with at least some bold formatting.
- A mixed paragraph containing Roman/Urdu-convertible text, preserved Arabic text, punctuation, and English terms.
- A page border and footer page number if these are important for the final document style.

If the user cannot upload a real file, ask for pasted text plus formatting notes in this structure:

```text
Heading text:
Heading color/style:

Arabic ayah text:
Arabic color/style:

Urdu tafseer text:
Urdu color/style:

English glossary words:
English color/style:

Expected Roman Urdu output for one paragraph:
```

After the synthetic fixture passes conversion tests, replace or supplement it with a real `.docx` sample whenever file transfer becomes available.

## Open implementation decisions

- Which AI provider and model will be used for production conversions.
- Whether converted Roman Urdu should preserve the original page breaks or allow Word to reflow naturally.
- Whether Arabic-only paragraphs should keep right-to-left alignment or be normalized with the rest of the output.
- How much manual review is required before sharing converted files with the team.
