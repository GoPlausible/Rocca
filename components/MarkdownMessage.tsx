import React, { memo } from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import CodeHighlighter from 'react-native-code-highlighter';
import { atomOneDark, atomOneLight } from 'react-syntax-highlighter/dist/esm/styles/hljs';

type Variant = 'mine' | 'peer';

interface Props {
  children: string;
  variant: Variant;
}

/**
 * Markdown renderer for chat messages. Two palettes:
 *   - "mine"  → blue bubble, white text (for my own messages)
 *   - "peer"  → gray bubble, dark text (for incoming agent messages)
 *
 * Custom render rules:
 *   - `fence` (```lang …```) → syntax-highlighted code block, horizontally
 *     scrollable so long lines don't overflow the bubble
 *   - `code_block` (indented) → same treatment as `fence` minus language
 *   - `table` → wrapped in a horizontal ScrollView so wide tables fit
 *
 * Memoized on `children + variant` so re-rendering the FlatList doesn't
 * reparse markdown for every existing message.
 */
function MarkdownMessageImpl({ children, variant }: Props) {
  const styles = variant === 'mine' ? mdMineStyles : mdPeerStyles;
  const codeTheme = variant === 'mine' ? atomOneDark : atomOneLight;

  return (
    <Markdown
      style={styles}
      onLinkPress={(url) => {
        Linking.openURL(url).catch(() => {
          /* swallow */
        });
        return true;
      }}
      rules={{
        // Fenced code blocks: ```ts code ```
        // CodeHighlighter brings its own horizontal ScrollView; we don't
        // need our own wrapper here.
        fence: (node) => {
          const language =
            (node as { sourceInfo?: string }).sourceInfo?.trim() || 'plaintext';
          const code = String(node.content ?? '').replace(/\n$/, '');
          return (
            <CodeHighlighter
              key={node.key}
              hljsStyle={codeTheme as unknown as { [k: string]: React.CSSProperties }}
              language={language}
              textStyle={styles.code_text}
              scrollViewProps={{
                showsHorizontalScrollIndicator: false,
                style: styles.code_block_wrap,
                contentContainerStyle: styles.code_block_inner,
              }}
            >
              {code}
            </CodeHighlighter>
          );
        },
        // Indented code blocks (4-space indent — no language hint).
        code_block: (node) => {
          const code = String(node.content ?? '').replace(/\n$/, '');
          return (
            <CodeHighlighter
              key={node.key}
              hljsStyle={codeTheme as unknown as { [k: string]: React.CSSProperties }}
              language="plaintext"
              textStyle={styles.code_text}
              scrollViewProps={{
                showsHorizontalScrollIndicator: false,
                style: styles.code_block_wrap,
                contentContainerStyle: styles.code_block_inner,
              }}
            >
              {code}
            </CodeHighlighter>
          );
        },
        // Wrap tables in a horizontal ScrollView so wide content doesn't
        // overflow the message bubble. flexGrow: 0 prevents the ScrollView
        // from stretching to fill the bubble vertically (its default).
        table: (node, children) => (
          <ScrollView
            key={node.key}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
          >
            <View style={styles.table}>{children}</View>
          </ScrollView>
        ),
      }}
    >
      {children}
    </Markdown>
  );
}

export const MarkdownMessage = memo(
  MarkdownMessageImpl,
  (prev, next) => prev.children === next.children && prev.variant === next.variant,
);

// ─── Palettes ───────────────────────────────────────────────────────────

const baseText: TextStyle = {
  fontSize: 16,
  lineHeight: 22,
};

const codeBlockWrapBase: ViewStyle = {
  borderRadius: 10,
  marginVertical: 6,
  paddingVertical: 0,
  // Critical: ScrollView (used by CodeHighlighter and our table wrapper)
  // defaults to `flexGrow: 1`, which makes it stretch to fill its parent
  // vertically. In a flex-column message bubble that means the bubble
  // balloons to the height of the FlatList row instead of hugging
  // content. Force flexGrow: 0 so the ScrollView is content-sized.
  flexGrow: 0,
};

const codeBlockInnerBase: ViewStyle = {
  paddingHorizontal: 12,
  paddingVertical: 10,
  borderRadius: 10,
};

const tableBase: ViewStyle = {
  borderWidth: StyleSheet.hairlineWidth,
  borderRadius: 8,
  marginVertical: 6,
};

// ── My messages: white-on-blue ──
const mdMineStyles = StyleSheet.create({
  body: { ...baseText, color: '#FFFFFF', flexShrink: 1 },
  paragraph: { marginVertical: 0 },
  strong: { color: '#FFFFFF', fontWeight: '700' },
  em: { color: '#FFFFFF', fontStyle: 'italic' },
  link: { color: '#BFDBFE', textDecorationLine: 'underline' },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: '#BFDBFE',
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.10)',
    marginVertical: 6,
    borderRadius: 4,
  },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  list_item: { color: '#FFFFFF' },
  hr: { backgroundColor: 'rgba(255,255,255,0.30)', height: StyleSheet.hairlineWidth },
  heading1: { ...baseText, color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginTop: 6 },
  heading2: { ...baseText, color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginTop: 6 },
  heading3: { ...baseText, color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginTop: 4 },
  code_inline: {
    fontFamily: 'monospace',
    fontSize: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    color: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  code_block_wrap: { ...codeBlockWrapBase, backgroundColor: '#1E3A8A' },
  code_block_content: {} as ViewStyle,
  code_block_inner: { ...codeBlockInnerBase, backgroundColor: '#1E3A8A' },
  code_text: { fontFamily: 'monospace', fontSize: 12 },
  table: { ...tableBase, borderColor: 'rgba(255,255,255,0.30)' },
  thead: { backgroundColor: 'rgba(255,255,255,0.18)' },
  tbody: {},
  th: { padding: 8, color: '#FFFFFF', fontWeight: '700', minWidth: 60 },
  tr: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.20)',
    flexDirection: 'row',
  },
  td: { padding: 8, color: '#FFFFFF', minWidth: 60 },
});

// ── Peer messages: dark-on-gray ──
const mdPeerStyles = StyleSheet.create({
  body: { ...baseText, color: '#1E293B', flexShrink: 1 },
  paragraph: { marginVertical: 0 },
  strong: { color: '#0F172A', fontWeight: '700' },
  em: { color: '#1E293B', fontStyle: 'italic' },
  link: { color: '#2563EB', textDecorationLine: 'underline' },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: '#94A3B8',
    paddingHorizontal: 10,
    backgroundColor: 'rgba(0,0,0,0.04)',
    marginVertical: 6,
    borderRadius: 4,
  },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  list_item: { color: '#1E293B' },
  hr: { backgroundColor: '#CBD5E1', height: StyleSheet.hairlineWidth },
  heading1: { ...baseText, color: '#0F172A', fontSize: 20, fontWeight: '800', marginTop: 6 },
  heading2: { ...baseText, color: '#0F172A', fontSize: 18, fontWeight: '800', marginTop: 6 },
  heading3: { ...baseText, color: '#0F172A', fontSize: 16, fontWeight: '700', marginTop: 4 },
  code_inline: {
    fontFamily: 'monospace',
    fontSize: 14,
    backgroundColor: '#CBD5E1',
    color: '#0F172A',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  code_block_wrap: { ...codeBlockWrapBase, backgroundColor: '#F1F5F9' },
  code_block_content: {} as ViewStyle,
  code_block_inner: { ...codeBlockInnerBase, backgroundColor: '#F1F5F9' },
  code_text: { fontFamily: 'monospace', fontSize: 12 },
  table: { ...tableBase, borderColor: '#CBD5E1' },
  thead: { backgroundColor: '#E2E8F0' },
  tbody: {},
  th: { padding: 8, color: '#0F172A', fontWeight: '700', minWidth: 60 },
  tr: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#CBD5E1',
    flexDirection: 'row',
  },
  td: { padding: 8, color: '#1E293B', minWidth: 60 },
});

