import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface Props {
    chart: string;
}

const MermaidRenderer: React.FC<Props> = ({ chart }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'loose',
        });
    }, []);

    useEffect(() => {
        const sanitizeMermaidCode = (code: string) => {
            // Remove any potential harmful characters or fix common syntax issues
            // Remove class definitions like :::bar1 which cause parsing errors
            let clean = code.replace(/:::\w+/g, '');
            // Remove classDef statements
            clean = clean.replace(/classDef\s+\w+\s+[^;]+;/g, '');

            // Auto-quote unquoted labels: A[Text] -> A["Text"]
            // Match [Text] where Text doesn't start with " and doesn't contain ]
            clean = clean.replace(/\[([^"\]][^\]]*)\]/g, '["$1"]');

            return clean.trim();
        };

        const renderLatexInMermaid = (code: string) => {
            return code.replace(/\$([^\$]+)\$/g, (match, latex) => {
                try {
                    const rendered = katex.renderToString(latex, {
                        throwOnError: false,
                        output: 'html',
                        displayMode: false
                    });
                    // Escape quotes for mermaid and remove newlines
                    return rendered.replace(/"/g, "'").replace(/\n/g, ' ');
                } catch (e) {
                    console.error("KaTeX error:", e);
                    return match;
                }
            });
        };

        const renderChart = async () => {
            if (!chart || !ref.current) return;

            try {
                // Robust sanitization: Extract code from markdown blocks
                let cleanChart = chart;
                const mermaidMatch = chart.match(/```mermaid\s*([\s\S]*?)```/);
                if (mermaidMatch) {
                    cleanChart = mermaidMatch[1];
                } else {
                    const codeMatch = chart.match(/```\s*([\s\S]*?)```/);
                    if (codeMatch) {
                        cleanChart = codeMatch[1];
                    }
                }

                cleanChart = sanitizeMermaidCode(cleanChart);
                cleanChart = renderLatexInMermaid(cleanChart);

                const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
                const { svg } = await mermaid.render(id, cleanChart);
                setSvg(svg);
                setError(null);
            } catch (err) {
                console.error("Mermaid rendering error:", err);
                setError(err instanceof Error ? err.message : "Gagal merender diagram (Unknown error).");
            }
        };

        renderChart();
    }, [chart]);

    if (error) {
        return (
            <div className="text-red-600 text-xs border border-red-200 bg-red-50 p-3 rounded-md">
                <p className="font-bold mb-1">Gagal merender diagram:</p>
                <p className="mb-2">{error}</p>
                <details>
                    <summary className="cursor-pointer font-semibold mb-1">Lihat Kode</summary>
                    <pre className="bg-gray-100 p-2 rounded overflow-x-auto font-mono text-[10px] whitespace-pre-wrap">
                        {chart}
                    </pre>
                </details>
            </div>
        );
    }

    return (
        <div
            ref={ref}
            className="mermaid-container my-4 flex justify-center overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
};

export default MermaidRenderer;
