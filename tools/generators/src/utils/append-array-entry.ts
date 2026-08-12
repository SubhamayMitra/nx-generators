import type { Tree } from '@nx/devkit';

export interface AppendArrayEntryOptions {
  filePath: string;
  /** Matches from the start of the file up to (and including) the array's opening `[`. */
  arrayStart: RegExp;
  /** The new entry's source text, without a trailing comma. */
  entryText: string;
  /** Returns true if an equivalent entry is already present — makes the append idempotent. */
  alreadyPresent: (fileContent: string) => boolean;
}

/**
 * Inserts a new entry into an array literal inside a TS/TSX source file,
 * used to register a new MFE into a shell's `mf.ts` PROVIDERS list and its
 * `app/routes.tsx` route list. Bracket-depth matching (not just the next
 * `]`) so entries that themselves contain arrays don't confuse it.
 */
export function appendArrayEntry(
  tree: Tree,
  options: AppendArrayEntryOptions,
): void {
  const content = tree.read(options.filePath, 'utf-8');
  if (content === null) {
    throw new Error(
      `Cannot append to ${options.filePath}: file does not exist.`,
    );
  }
  if (options.alreadyPresent(content)) {
    return;
  }

  const startMatch = options.arrayStart.exec(content);
  if (!startMatch) {
    throw new Error(
      `Cannot find an array declaration matching ${options.arrayStart} in ${options.filePath}.`,
    );
  }

  const openBracketIndex = startMatch.index + startMatch[0].length - 1;
  const closeBracketIndex = findMatchingCloseBracket(content, openBracketIndex);

  const before = content.slice(0, closeBracketIndex);
  const after = content.slice(closeBracketIndex);
  const arrayBody = before.slice(openBracketIndex + 1);
  const needsComma = /\S/.test(arrayBody) && !/,\s*$/.test(before);

  const insertion = `${needsComma ? ',' : ''}\n  ${options.entryText},\n`;
  tree.write(options.filePath, `${before}${insertion}${after}`);
}

/** Replaces the full contents of an array literal with an empty array. */
export function resetArrayEntries(
  tree: Tree,
  filePath: string,
  arrayStart: RegExp,
): void {
  const content = tree.read(filePath, 'utf-8');
  if (content === null) {
    throw new Error(`Cannot reset ${filePath}: file does not exist.`);
  }
  const startMatch = arrayStart.exec(content);
  if (!startMatch) {
    throw new Error(
      `Cannot find an array declaration matching ${arrayStart} in ${filePath}.`,
    );
  }
  const openBracketIndex = startMatch.index + startMatch[0].length - 1;
  const closeBracketIndex = findMatchingCloseBracket(content, openBracketIndex);
  tree.write(
    filePath,
    `${content.slice(0, openBracketIndex + 1)}${content.slice(closeBracketIndex)}`,
  );
}

function findMatchingCloseBracket(
  content: string,
  openBracketIndex: number,
): number {
  let depth = 0;
  for (let i = openBracketIndex; i < content.length; i++) {
    if (content[i] === '[') {
      depth++;
    } else if (content[i] === ']') {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  throw new Error('Unbalanced brackets while searching for the array close.');
}
