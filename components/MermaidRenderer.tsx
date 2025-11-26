import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

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
                cleanChart = cleanChart.trim();

                // Auto-fix common syntax errors (e.g., unquoted parentheses in nodes)
                const sanitizeMermaidCode = (code: string) => {
                    // Fix: A[Text (With Parens)] -> A["Text (With Parens)"]
                    // Matches content inside [], (), {}, >] that contains ( or ) but isn't already quoted
                    return code.replace(/([\[\(\{\>])\s*([^"\[\]\(\)\{\}]+?[\(\)][^"\[\]\(\)\{\}]+?)\s*([\]\)\}\]])/g, '$1"$2"$3');
                };

                cleanChart = sanitizeMermaidCode(cleanChart);

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
