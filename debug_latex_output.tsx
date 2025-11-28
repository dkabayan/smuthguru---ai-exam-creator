import React from 'react';
import ReactDOMServer from 'react-dom/server';
import LatexRenderer from './components/LatexRenderer';

const debug = () => {
    const text = "Nilai dari $\\lim_{x \\to 2} (3x^2 - 5x + 7)$ adalah...";
    let html = ReactDOMServer.renderToStaticMarkup(<LatexRenderer text={text} output="mathml" />);
    console.log("--- Original HTML ---");
    console.log(html);

    // Strip annotation tags
    html = html.replace(/<annotation encoding="application\/x-tex">.*?<\/annotation>/g, '');
    // Strip semantics tags but keep content
    html = html.replace(/<\/?semantics>/g, '');

    console.log("--- Cleaned HTML ---");
    console.log(html);
};

debug();
