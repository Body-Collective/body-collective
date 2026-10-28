/**
 * Formatted texts of listings (description, about this treatment, treatment approach, ...): the
 * editor of the listing form is rich (bold, italic, underline, lists), but the text is stored as
 * plain text with marks, so that keyword search, translations and Console show readable text:
 *
 *   **bold**, _italic_, ++underline++
 *   - a bullet point
 *   1. a numbered point
 *   ---  (a divider line)
 *
 * Every other line is a paragraph. An empty line between paragraphs is kept as a gap (like the
 * profile texts): one line break is a new line, an empty line a new paragraph. Texts written before
 * the editor (plain lines) read the same.
 * textToDoc and docToText convert between this text and the editor's document (Tiptap JSON);
 * parseFormattedText gives the blocks to render (see components/FormattedText).
 */

// "- item", "• item", and "* item" or "*item" (one star: two are bold)
const BULLET = /^\s*(?:[-•]\s+|\*(?!\*)\s*)(\S.*)$/;
const DIVIDER = /^\s*-{3,}\s*$/;
const NUMBERED = /^\s*\d+\.\s+(.*)$/;
// Bold, underline, and italic only between non-word characters (snake_case stays as written)
const MARKS = /\*\*(.+?)\*\*|\+\+(.+?)\+\+|(?<![\p{L}\p{N}_])_(.+?)_(?![\p{L}\p{N}_])/gu;

const MARK_BOLD = 'bold';
const MARK_ITALIC = 'italic';
const MARK_UNDERLINE = 'underline';

/**
 * The inline parts of a line, with their marks.
 *
 * @param {string} text One line
 * @param {Array<string>} marks Marks of the enclosing part
 * @returns {Array<{ text: string, marks: Array<string> }>}
 */
export const parseInline = (text, marks = []) => {
  const parts = [];
  const pattern = new RegExp(MARKS.source, MARKS.flags);
  let last = 0;
  let match;
  while ((match = pattern.exec(text))) {
    if (match.index > last) {
      parts.push({ text: text.slice(last, match.index), marks });
    }
    const [, bold, underline, italic] = match;
    const mark = bold != null ? MARK_BOLD : underline != null ? MARK_UNDERLINE : MARK_ITALIC;
    const inner = bold ?? underline ?? italic;
    parts.push(...parseInline(inner, marks.includes(mark) ? marks : [...marks, mark]));
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    parts.push({ text: text.slice(last), marks });
  }
  return parts;
};

// Texts written before the editor can have their list on one line, with "*" before each point
// and two spaces where a line ended: "It may include:  *oil massage *marma points  Then …"
const INLINE_BULLET = /\s+\*(?!\*)\s*(?=\S)/g;
const MIN_INLINE_BULLETS = 2;

const splitInlineList = line => {
  const bullets = line.match(INLINE_BULLET) || [];
  if (bullets.length < MIN_INLINE_BULLETS) {
    return [line];
  }
  return line
    .split(/ {2,}/)
    .flatMap(part => part.replace(INLINE_BULLET, '\n- ').split('\n'))
    .map(part => part.trim())
    .filter(Boolean);
};

/**
 * The blocks of a formatted text: paragraphs and lists, each line as inline parts.
 *
 * @param {string} text
 * @returns {Array<{ type: 'paragraph', parts: Array }|{ type: 'bulletList'|'orderedList', items: Array<Array> }|{ type: 'divider' }|{ type: 'gap' }>}
 */
export const parseFormattedText = text => {
  const blocks = [];
  // The list that the next list line continues, if any
  let list = null;
  // An empty line since the last block: a gap before the next one (none at the start or the end)
  let hasGap = false;
  const push = block => {
    if (hasGap && blocks.length > 0) {
      blocks.push({ type: 'gap' });
    }
    hasGap = false;
    blocks.push(block);
  };

  `${text || ''}`
    .split('\n')
    .flatMap(splitInlineList)
    .forEach(line => {
      const bullet = BULLET.exec(line);
      const numbered = NUMBERED.exec(line);
      if (!DIVIDER.test(line) && (bullet || numbered)) {
        const type = numbered ? 'orderedList' : 'bulletList';
        if (!list || list.type !== type || hasGap) {
          list = { type, items: [] };
          push(list);
        }
        list.items.push(parseInline((bullet || numbered)[1]));
        return;
      }
      list = null;
      if (DIVIDER.test(line)) {
        push({ type: 'divider' });
      } else if (line.trim()) {
        push({ type: 'paragraph', parts: parseInline(line) });
      } else {
        hasGap = true;
      }
    });
  return blocks;
};

/**
 * The text without marks and list signs, e.g. for meta descriptions.
 *
 * @param {string} text
 * @returns {string}
 */
export const stripFormatting = text =>
  parseFormattedText(text)
    .map(block =>
      block.type === 'divider' || block.type === 'gap'
        ? ''
        : block.type === 'paragraph'
        ? block.parts.map(p => p.text).join('')
        : block.items.map(item => item.map(p => p.text).join('')).join('\n')
    )
    .join('\n');

/**
 * Whether the text has any content (marks and empty lines are not content).
 *
 * @param {string} text
 * @returns {boolean}
 */
export const hasFormattedContent = text => stripFormatting(text).trim() !== '';

// Editor document (Tiptap JSON)

const paragraphNode = parts => {
  const content = parts
    .filter(part => part.text)
    .map(part => ({
      type: 'text',
      text: part.text,
      ...(part.marks.length > 0 ? { marks: part.marks.map(type => ({ type })) } : {}),
    }));
  return content.length > 0 ? { type: 'paragraph', content } : { type: 'paragraph' };
};

/**
 * The stored text to the editor's document.
 *
 * @param {string} text
 * @returns {Object} Tiptap JSON document
 */
export const textToDoc = text => {
  const content = parseFormattedText(text).map(block =>
    block.type === 'gap'
      ? { type: 'paragraph' }
      : block.type === 'divider'
      ? { type: 'horizontalRule' }
      : block.type === 'paragraph'
      ? paragraphNode(block.parts)
      : {
          type: block.type,
          content: block.items.map(item => ({
            type: 'listItem',
            content: [paragraphNode(item)],
          })),
        }
  );
  return { type: 'doc', content: content.length > 0 ? content : [{ type: 'paragraph' }] };
};

// One inline part back to text with its marks
function partToText(part) {
  const [, lead, body, trail] = /^(\s*)([\s\S]*?)(\s*)$/.exec(part.text);
  if (!body) {
    return part.text;
  }
  // Marks wrap the text, not its surrounding spaces, or "**bold ** next" would not parse
  let text = body;
  if (part.marks.includes(MARK_ITALIC)) {
    text = `_${text}_`;
  }
  if (part.marks.includes(MARK_UNDERLINE)) {
    text = `++${text}++`;
  }
  if (part.marks.includes(MARK_BOLD)) {
    text = `**${text}**`;
  }
  return `${lead}${text}${trail}`;
}

const KNOWN_MARKS = [MARK_BOLD, MARK_ITALIC, MARK_UNDERLINE];

// The text of an inline node (and its children), with marks
const inlineToText = node => {
  if (node.type === 'hardBreak') {
    return ' ';
  }
  if (node.type === 'text') {
    const marks = (node.marks || []).map(m => m.type).filter(m => KNOWN_MARKS.includes(m));
    return partToText({ text: node.text || '', marks });
  }
  return (node.content || []).map(inlineToText).join('');
};

/**
 * The editor's document back to the stored text.
 *
 * @param {Object} doc Tiptap JSON document
 * @returns {string}
 */
export const docToText = doc => {
  const lines = [];
  (doc?.content || []).forEach(node => {
    if (node.type === 'horizontalRule') {
      lines.push('---');
      return;
    }
    if (node.type === 'bulletList' || node.type === 'orderedList') {
      (node.content || []).forEach((item, i) => {
        const body = (item.content || [])
          .map(inlineToText)
          .join(' ')
          .trim();
        lines.push(`${node.type === 'orderedList' ? `${i + 1}.` : '-'} ${body}`);
      });
      return;
    }
    lines.push(inlineToText(node));
  });
  // Empty paragraphs at the end are not content
  while (lines.length > 0 && !lines[lines.length - 1].trim()) {
    lines.pop();
  }
  return lines.join('\n');
};
