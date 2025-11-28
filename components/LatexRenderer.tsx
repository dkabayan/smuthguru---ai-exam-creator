import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import 'katex/dist/contrib/mhchem';

interface Props {
  text: string;
  output?: 'html' | 'mathml';
}

const LatexRenderer: React.FC<Props> = ({ text, output = 'html' }) => {
  // Preprocess text to fix common Markdown table issues
  const preprocessText = (rawText: string) => {
    if (!rawText) return "";

    // Fix single-line tables: "Header | Header |---|---| Cell | Cell" -> "Header | Header \n |---|---| \n Cell | Cell"
    // Match the ENTIRE separator row (e.g. |---|---|) including spaces
    let processed = rawText.replace(/([^\n])\s*((?:\|\s*:?-+:?\s*)+\|)\s*([^\n])/g, '$1\n$2\n$3');

    // Also ensure newlines before the table starts if it's jammed against text
    processed = processed.replace(/([^\n])\s*(\|.*\|)\s*(\n\|\s*:?-+:?\s*\|)/g, '$1\n$2$3');

    // Fix split separator lines: |---|\n|---| -> |---|---|
    // Repeat to handle multiple columns
    let previous = "";
    while (processed !== previous) {
      previous = processed;
      // Match |---| (end of line) and |---| (start of next) and merge with single pipe
      // Handle spaces: | --- |
      processed = processed.replace(/(\|\s*:?-+:?)\|\s*\n\s*\|(:?-+:?\s*\|)/g, '$1|$2');
    }

    // Remove <br> tags (case insensitive)
    processed = processed.replace(/<br\s*\/?>/gi, '\n');

    // Ensure $$ (display math) is always on its own line
    processed = processed.replace(/(\$\$)/g, '\n$1\n');

    // Collapse multiple newlines (including lines with only whitespace) into max 2
    processed = processed.replace(/\n\s*\n/g, '\n\n');
    processed = processed.replace(/\n{3,}/g, '\n\n');

    // Trim leading/trailing whitespace
    processed = processed.trim();

    return processed;
  };

  const cleanText = preprocessText(text);

  const rehypePlugins = [
    [rehypeKatex, { output: output }] as any,
    rehypeRaw
  ];

  return (
    <div className="prose prose-blue max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={rehypePlugins}
        components={{
          // Custom components if needed, e.g. for tables to add styling
          table: ({ node, ...props }) => <div className="overflow-x-auto my-4"><table className="min-w-full divide-y divide-gray-200 border border-collapse" {...props} /></div>,
          thead: ({ node, ...props }) => <thead className="bg-gray-50" {...props} />,
          th: ({ node, ...props }) => <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border border-gray-300" {...props} />,
          tbody: ({ node, ...props }) => <tbody className="bg-white divide-y divide-gray-200" {...props} />,
          tr: ({ node, ...props }) => <tr className="hover:bg-gray-50" {...props} />,
          td: ({ node, ...props }) => <td className="px-4 py-2 text-sm text-gray-700 border border-gray-300 align-top" {...props} />,
        }}
      >
        {cleanText}
      </ReactMarkdown>
    </div>
  );
};

export default LatexRenderer;