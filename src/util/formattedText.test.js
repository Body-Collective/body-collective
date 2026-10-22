import {
  docToText,
  hasFormattedContent,
  parseFormattedText,
  parseInline,
  stripFormatting,
  textToDoc,
} from './formattedText';

describe('formattedText', () => {
  const text = [
    'Each session is **individually** adapted and _may_ include:',
    '- traditional **_oil_** massage',
    '- ++marma++ points',
    '---',
    '1. first',
    '2. second',
    'Note: snake_case_words stay as written.',
  ].join('\n');

  it('parses marks, nested marks and plain words with underscores', () => {
    expect(parseInline('a **b _c_** ++d++ e_f_g')).toEqual([
      { text: 'a ', marks: [] },
      { text: 'b ', marks: ['bold'] },
      { text: 'c', marks: ['bold', 'italic'] },
      { text: ' ', marks: [] },
      { text: 'd', marks: ['underline'] },
      { text: ' e_f_g', marks: [] },
    ]);
  });

  it('parses paragraphs, lists and dividers', () => {
    expect(parseFormattedText(text).map(b => b.type)).toEqual([
      'paragraph',
      'bulletList',
      'divider',
      'orderedList',
      'paragraph',
    ]);
  });

  it('keeps the text through the editor document', () => {
    expect(docToText(textToDoc(text))).toEqual(text);
  });

  it('keeps plain texts with empty lines readable', () => {
    expect(docToText(textToDoc('First line\n\nSecond line'))).toEqual('First line\nSecond line');
  });

  it('strips marks and tells whether there is content', () => {
    expect(stripFormatting('**Bold** and _it_\n- one')).toEqual('Bold and it\none');
    expect(hasFormattedContent('**  **\n\n')).toBe(false);
    expect(hasFormattedContent('Hello')).toBe(true);
  });

  it('reads lists written on one line before the editor', () => {
    const legacy =
      'Each session may include:  *traditional oil massage (Abhyanga) *work on circulation * gentle marma points  The emphasis is on warmth.';
    const blocks = parseFormattedText(legacy);
    expect(blocks.map(b => b.type)).toEqual(['paragraph', 'bulletList', 'paragraph']);
    expect(blocks[1].items.map(item => item.map(p => p.text).join(''))).toEqual([
      'traditional oil massage (Abhyanga)',
      'work on circulation',
      'gentle marma points',
    ]);
    // One star alone is not a list, two are bold
    expect(parseFormattedText('Price * 2').map(b => b.type)).toEqual(['paragraph']);
    expect(parseFormattedText('**Bold** start')[0].type).toEqual('paragraph');
  });
});
