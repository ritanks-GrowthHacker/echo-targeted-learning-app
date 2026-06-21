"use client";

import "katex/dist/katex.min.css";
import { InlineMath, BlockMath } from "react-katex";

export function MathRenderer({ text, className }: { text: string; className?: string }) {
  try {
    const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^$]+\$)/g).filter(Boolean);
    return (
      <span className={className}>
        {parts.map((part, index) => {
          if (part.startsWith("$$") && part.endsWith("$$")) {
            return <BlockMath key={index} math={part.slice(2, -2)} />;
          }
          if (part.startsWith("$") && part.endsWith("$")) {
            return <InlineMath key={index} math={part.slice(1, -1)} />;
          }
          return <span key={index}>{part}</span>;
        })}
      </span>
    );
  } catch {
    return <span className={className}>{text}</span>;
  }
}
