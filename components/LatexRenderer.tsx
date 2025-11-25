import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface Props {
  text: string;
}

const LatexRenderer: React.FC<Props> = ({ text }) => {
  return (
    <div className="prose prose-blue max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Custom components if needed, e.g. for tables to add styling
          table: ({ node, ...props }) => <table className="min-w-full divide-y divide-gray-200 border" {...props} />,
          thead: ({ node, ...props }) => <thead className="bg-gray-50" {...props} />,
          th: ({ node, ...props }) => <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r" {...props} />,
          tbody: ({ node, ...props }) => <tbody className="bg-white divide-y divide-gray-200" {...props} />,
          tr: ({ node, ...props }) => <tr className="hover:bg-gray-50" {...props} />,
          td: ({ node, ...props }) => <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-r" {...props} />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
};

export default LatexRenderer;