import type * as Monaco from 'monaco-editor/editor/editor.api'

let registered = false

export function registerTypstLanguage(monaco: typeof Monaco): void {
  if (registered) return
  registered = true
  monaco.languages.register({ id: 'typst', extensions: ['.typ'] })
  monaco.languages.setLanguageConfiguration('typst', {
    comments: { lineComment: '//', blockComment: ['/*', '*/'] },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: '$', close: '$' },
    ],
  })
  monaco.languages.setMonarchTokensProvider('typst', {
    tokenizer: {
      root: [
        [/\/\/.*$/, 'comment'],
        [/\/\*/, 'comment', '@comment'],
        [/#[a-zA-Z][\w-]*/, 'keyword'],
        [/@(?:preview|local)\/[\w-]+:\d+(?:\.\d+)*/, 'type.identifier'],
        [/\b(?:let|set|show|import|include|if|else|for|while|return)\b/, 'keyword'],
        [/\d+(?:\.\d+)?(?:pt|mm|cm|in|em|fr|deg|rad|%)?/, 'number'],
        [/"([^"\\]|\\.)*"/, 'string'],
        [/`[^`]*`/, 'string'],
        [/^\s*=+.*$/, 'type'],
        [/\$[^$]*\$/, 'number'],
      ],
      comment: [
        [/[^/*]+/, 'comment'],
        [/\*\//, 'comment', '@pop'],
        [/[/*]/, 'comment'],
      ],
    },
  })
}
