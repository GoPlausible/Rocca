// Ambient declarations for `react-syntax-highlighter`'s ESM hljs styles
// subpath. The package ships JS but no .d.ts for this entry. We only
// consume a couple of theme objects, so a loose shape is enough.
//
// (The `react-native-code-highlighter` component itself ships its own
// types; no shim needed for it.)

declare module 'react-syntax-highlighter/dist/esm/styles/hljs' {
  type HighlightStyle = { [token: string]: { [css: string]: string } };
  export const atomOneDark: HighlightStyle;
  export const atomOneLight: HighlightStyle;
  // Other themes exist in the package; add as needed.
}
