import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          const codeString = String(children).replace(/\n$/, "");
          if (match) {
            return (
              <SyntaxHighlighter
                style={oneDark}
                language={match[1]}
                PreTag="div"
                customStyle={{
                  margin: "8px 0",
                  borderRadius: "4px",
                  fontSize: "12px",
                }}
              >
                {codeString}
              </SyntaxHighlighter>
            );
          }
          return (
            <code
              className={className}
              style={{
                background: "var(--kira-bg-input)",
                padding: "2px 6px",
                borderRadius: "3px",
                fontSize: "12px",
              }}
              {...props}
            >
              {children}
            </code>
          );
        },
        table({ children }) {
          return (
            <table
              style={{
                borderCollapse: "collapse",
                width: "100%",
                fontSize: "12px",
                margin: "8px 0",
              }}
            >
              {children}
            </table>
          );
        },
        th({ children }) {
          return (
            <th
              style={{
                textAlign: "left",
                padding: "6px 8px",
                borderBottom: "1px solid var(--kira-border)",
                color: "var(--kira-text-muted)",
              }}
            >
              {children}
            </th>
          );
        },
        td({ children }) {
          return (
            <td
              style={{
                padding: "6px 8px",
                borderBottom: "1px solid var(--kira-border-subtle)",
              }}
            >
              {children}
            </td>
          );
        },
        p({ children }) {
          return <p style={{ margin: "6px 0", lineHeight: 1.6 }}>{children}</p>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
