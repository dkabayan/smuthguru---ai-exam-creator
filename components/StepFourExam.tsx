import React, { useState, useMemo } from 'react';
import ReactDOMServer from 'react-dom/server';
import { ExamConfig, QuestionItem } from '../types';
import LatexRenderer from './LatexRenderer';
import MermaidRenderer from './MermaidRenderer';
import katex from 'katex';

interface Props {
  config: ExamConfig;
  questions: QuestionItem[];
  onBack: () => void;
}

const StepFourExam: React.FC<Props> = ({ config, questions, onBack }) => {
  const [showKey, setShowKey] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  // Memoize shuffled questions so they don't reshuffle on re-renders
  const shuffledQuestions = useMemo(() => {
    return questions.map(q => {
      // Check if Essay (no options or empty options)
      const isEssay = !q.options || q.options.length === 0;

      // If Essay, no shuffling needed
      if (isEssay) return q;

      // --- Multiple Choice Shuffle Logic ---

      // 1. Clean up existing options (remove prefixes like "A. ", "B. ")
      const cleanOptions = q.options!.map(opt => opt.replace(/^[A-E][\.\)]\s*/, '').trim());

      // 2. Identify which index is currently the correct answer
      let originalCorrectIndex = -1;

      // Try identifying by Letter (e.g., "A", "A. Jawaban")
      const keyLetter = q.correctAnswer.trim().toUpperCase().charAt(0);
      if (['A', 'B', 'C', 'D', 'E'].includes(keyLetter)) {
        // If key is just "A" or "A. Something"
        if (q.correctAnswer.length === 1 || q.correctAnswer.match(/^[A-E][\.\)]/)) {
          originalCorrectIndex = keyLetter.charCodeAt(0) - 65;
        }
      }

      // Fallback: Try identifying by Text match
      if (originalCorrectIndex === -1 || originalCorrectIndex >= cleanOptions.length) {
        const cleanKey = q.correctAnswer.replace(/^[A-E][\.\)]\s*/, '').trim();
        originalCorrectIndex = cleanOptions.findIndex(opt =>
          opt.toLowerCase() === cleanKey.toLowerCase() ||
          cleanKey.includes(opt)
        );
      }

      // If we still can't find the correct answer, preserve original
      if (originalCorrectIndex === -1) return q;

      // 3. Create objects to shuffle
      const optionsWithFlag = cleanOptions.map((text, index) => ({
        text,
        isCorrect: index === originalCorrectIndex
      }));

      // 4. Fisher-Yates Shuffle
      for (let i = optionsWithFlag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [optionsWithFlag[i], optionsWithFlag[j]] = [optionsWithFlag[j], optionsWithFlag[i]];
      }

      // 5. Reconstruct the question with new order and new key
      const newOptions = optionsWithFlag.map(o => o.text);
      const newCorrectIndex = optionsWithFlag.findIndex(o => o.isCorrect);
      const newCorrectLetter = String.fromCharCode(65 + newCorrectIndex); // New A, B, C...

      return {
        ...q,
        options: newOptions,
        correctAnswer: `${newCorrectLetter}. ${optionsWithFlag[newCorrectIndex].text}`,
        explanation: q.explanation,
        imageDescription: q.imageDescription
      };
    });
  }, [questions]);

  const sanitizeFilename = (text: string) => {
    return text.replace(/[^a-z0-9\-_]/gi, '_').replace(/_+/g, '_');
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadGIFT = () => {
    let giftContent = "";

    shuffledQuestions.forEach((q, idx) => {
      const isEssay = !q.options || q.options.length === 0;
      // Escape special GIFT characters in text: { } ~ = # :
      const safeText = (text: string) => text.replace(/([{}~=#:])/g, "\\$1").replace(/\n/g, " ");

      giftContent += `::Soal ${idx + 1}:: `;

      let qText = q.questionText;
      if (q.imageDescription) {
        qText = `[IMAGE DESCRIPTION: ${q.imageDescription}] ` + qText;
      }

      giftContent += `${safeText(qText)} {\n`;

      if (!isEssay && q.options && q.options.length > 0) {
        q.options.forEach((opt, i) => {
          const optionLetter = String.fromCharCode(65 + i);
          const safeOpt = safeText(opt);
          const keyLetter = q.correctAnswer.trim().toUpperCase().charAt(0);
          const isCorrect = keyLetter === optionLetter;

          const prefix = isCorrect ? "=" : "~";
          giftContent += `\t${prefix}${safeOpt}\n`;
        });
      } else {
        giftContent += `\t{}\n`;
      }

      if (q.explanation) {
        giftContent += `\t####${safeText(q.explanation)}\n`;
      }
      giftContent += "}\n\n";
    });

    // Add BOM for UTF-8 recognition
    const bom = "\uFEFF";
    const filename = `Soal_${sanitizeFilename(config.subject)}_${sanitizeFilename(config.grade)}.gift.txt`;
    downloadFile(bom + giftContent, filename, 'text/plain;charset=utf-8');
  };

  // Helper to preprocess text for common formatting issues
  const preprocessText = (text: string) => {
    if (!text) return "";
    let processed = text;

    // 1. Ensure table starts on new line if following a colon (common AI artifact)
    processed = processed.replace(/:\s*(\|)/g, ":\n$1");

    // 2. Fix compressed table rows (|| -> |\n|)
    // Require space after || to avoid math norms like ||x|| (unless spaced)
    processed = processed.replace(/\|\s*\|\s+/g, "|\n| ");

    return processed;
  };

  // Helper to convert Markdown tables to HTML
  const markdownTableToHtml = (text: string) => {
    if (!text) return "";

    // Preprocess text to fix table formatting issues
    const processedText = preprocessText(text);

    // Regex to detect markdown tables
    // Matches blocks of lines that start and end with | (allowing for whitespace)
    // Uses multiline flag to match start of lines
    const tableBlockRegex = /((?:^\s*\|.*\|\s*(?:\r?\n|$))+)/gm;

    return processedText.replace(tableBlockRegex, (match) => {
      const lines = match.trim().split(/\r?\n/);
      if (lines.length < 2) return match;

      // Validate separator line (index 1)
      // It must contain only |, -, :, and whitespace
      const separatorLine = lines[1].trim();
      const invalidChars = separatorLine.replace(/[|\-\s:]/g, '');
      if (invalidChars.length > 0 || !separatorLine.includes('-')) return match;

      let html = '<table border="1" style="border-collapse: collapse; width: 100%; margin-bottom: 10px;">';

      const processRow = (line: string, isHeader: boolean) => {
        // Split by pipe, but handle leading/trailing pipes correctly
        // e.g. "| a | b |" should result in ["a", "b"]
        let cells = line.trim().split('|');
        // Remove first empty element if line starts with pipe
        if (line.trim().startsWith('|') && cells.length > 0 && cells[0] === '') cells.shift();
        // Remove last empty element if line ends with pipe
        if (line.trim().endsWith('|') && cells.length > 0 && cells[cells.length - 1] === '') cells.pop();

        let rowHtml = '<tr>';
        cells.forEach(c => {
          const tag = isHeader ? 'th' : 'td';
          const style = isHeader
            ? 'border: 1px solid #999; padding: 8px; background-color: #f2f2f2; font-weight: bold;'
            : 'border: 1px solid #999; padding: 8px;';
          rowHtml += `<${tag} style="${style}">${c.trim()}</${tag}>`;
        });
        rowHtml += '</tr>';
        return rowHtml;
      };

      // Header
      html += '<thead>' + processRow(lines[0], true) + '</thead>';
      html += '<tbody>';

      // Body (skip separator line at index 1)
      for (let i = 2; i < lines.length; i++) {
        html += processRow(lines[i], false);
      }

      html += '</tbody></table>';
      return html;
    });
  };

  // Helper to replace LaTeX with Images
  const latexToImg = (text: string) => {
    if (!text) return "";
    let processed = text;

    // Convert Markdown tables first
    processed = markdownTableToHtml(processed);

    // Replace $$...$$ (display math)
    processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (match, tex) => {
      const encoded = encodeURIComponent(tex.trim());
      // Use explicit encoding for backslashes if needed, but encodeURIComponent usually handles it.
      // CodeCogs sometimes prefers %5C for backslash.
      return `<br/><img src="https://latex.codecogs.com/png.latex?\\dpi{150}\\large ${encoded}" /><br/>`;
    });
    // Replace $...$ (inline math)
    processed = processed.replace(/\$([\s\S]*?)\$/g, (match, tex) => {
      const encoded = encodeURIComponent(tex.trim());
      return `<img src="https://latex.codecogs.com/png.latex?\\dpi{120} ${encoded}" />`;
    });
    // Replace newlines
    return processed.replace(/\n/g, '<br/>');
  };

  const handleDownloadDocxImages = () => {
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>Naskah Soal (Images)</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 12pt; }
          .header { text-align: center; font-weight: bold; margin-bottom: 20px; }
          table.q-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          td.num { width: 30px; vertical-align: top; }
          td.content { vertical-align: top; }
          .opt-table { width: 100%; margin-top: 5px; }
          .opt-letter { width: 25px; vertical-align: top; }
          img { vertical-align: middle; }
        </style>
      </head>
      <body>
        <div class="header">
          <p>NASKAH SOAL UJIAN</p>
          <p>Mata Pelajaran: ${config.subject}</p>
          <p>Kelas: ${config.grade}</p>
          <p style="font-size: 8pt; color: #888; margin-top: 5px;">(Generated v3 - Images)</p>
        </div>
    `;

    let content = "";

    shuffledQuestions.forEach((q, idx) => {
      const isEssay = !q.options || q.options.length === 0;

      content += `
        <table class="q-table">
          <tr>
            <td class="num">${idx + 1}.</td>
            <td class="content">
              ${q.imageDescription ? `<div style="text-align:center; margin-bottom:15px; padding:10px; border:1px solid #ddd; background-color:#f8f9fa; border-radius:4px;"><p style="margin:0; font-style:italic; color:#555;"><strong>Ilustrasi Gambar:</strong> ${q.imageDescription}</p></div>` : ''}
              <div dir="auto">${latexToImg(q.questionText)}</div>
      `;

      if (!isEssay && q.options && q.options.length > 0) {
        content += `<table class="opt-table">`;
        q.options.forEach((opt, i) => {
          content += `
              <tr>
                <td class="opt-letter">${String.fromCharCode(65 + i)}.</td>
                <td dir="auto">${latexToImg(opt)}</td>
              </tr>
            `;
        });
        content += `</table>`;
      } else {
        // Essay lines
        content += `<br/><br/><hr/><br/><br/>`;
      }

      content += `
            </td>
          </tr>
        </table>
      `;
    });

    const footer = `</body></html>`;
    const filename = `Naskah_Soal_${sanitizeFilename(config.subject)}_Img.doc`;
    downloadFile(header + content + footer, filename, 'application/msword');
  };

  const handleDownloadDocx = () => {
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns:m='http://schemas.microsoft.com/office/2004/12/omml' xmlns:mml='http://www.w3.org/1998/Math/MathML' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>Naskah Soal</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 12pt; }
          .header { text-align: center; font-weight: bold; margin-bottom: 20px; }
          table.q-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          td.num { width: 30px; vertical-align: top; }
          td.content { vertical-align: top; }
          .opt-table { width: 100%; margin-top: 5px; }
          .opt-letter { width: 25px; vertical-align: top; }
        </style>
      </head>
      <body>
        <div class="header">
          <p>NASKAH SOAL UJIAN</p>
          <p>Mata Pelajaran: ${config.subject}</p>
          <p>Kelas: ${config.grade}</p>
          <p style="font-size: 8pt; color: #888; margin-top: 5px;">(Generated v2)</p>
        </div>
    `;

    let content = "";

    shuffledQuestions.forEach((q, idx) => {
      const isEssay = !q.options || q.options.length === 0;

      // Render components to static HTML string
      const cleanHtml = (html: string) => {
        return html
          .replace(/<annotation encoding="application\/x-tex">.*?<\/annotation>/g, '')
          .replace(/<\/?semantics>/g, '')
          .replace(/\u2061/g, '') // Remove invisible function application character
          .replace(/<span class="katex">\s*(<math[\s\S]*?<\/math>)\s*<\/span>/g, '$1'); // Unwrap span.katex
      };

      const questionHtml = cleanHtml(ReactDOMServer.renderToStaticMarkup(<LatexRenderer text={q.questionText} output="mathml" />));

      content += `
        <table class="q-table">
          <tr>
            <td class="num">${idx + 1}.</td>
            <td class="content">
              ${q.imageDescription ? `<div style="text-align:center; margin-bottom:15px; padding:10px; border:1px solid #ddd; background-color:#f8f9fa; border-radius:4px;"><p style="margin:0; font-style:italic; color:#555;"><strong>Ilustrasi Gambar:</strong> ${q.imageDescription}</p></div>` : ''}
              <div dir="auto">${questionHtml}</div>
      `;

      if (!isEssay && q.options && q.options.length > 0) {
        content += `<table class="opt-table">`;
        q.options.forEach((opt, i) => {
          const optHtml = cleanHtml(ReactDOMServer.renderToStaticMarkup(<LatexRenderer text={opt} output="mathml" />));
          content += `
              <tr>
                <td class="opt-letter">${String.fromCharCode(65 + i)}.</td>
                <td dir="auto">${optHtml}</td>
              </tr>
            `;
        });
        content += `</table>`;
      } else {
        // Essay lines
        content += `<br/><br/><hr/><br/><br/>`;
      }

      content += `
            </td>
          </tr>
        </table>
      `;
    });

    const footer = `</body></html>`;
    const filename = `Naskah_Soal_${sanitizeFilename(config.subject)}.doc`;
    downloadFile(header + content + footer, filename, 'application/msword');
  };

  const handleDownloadDocxWithKey = () => {
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns:m='http://schemas.microsoft.com/office/2004/12/omml' xmlns:mml='http://www.w3.org/1998/Math/MathML' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>Naskah Soal & Kunci</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 12pt; }
          .header { text-align: center; font-weight: bold; margin-bottom: 20px; }
          table.q-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          td.num { width: 30px; vertical-align: top; }
          td.content { vertical-align: top; }
          .opt-table { width: 100%; margin-top: 5px; }
          .opt-letter { width: 25px; vertical-align: top; }
          .page-break { page-break-before: always; }
          .key-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .key-table td, .key-table th { border: 1px solid #000; padding: 5px; text-align: left; }
        </style>
      </head>
      <body>
        <div class="header">
          <p>NASKAH SOAL UJIAN</p>
          <p>Mata Pelajaran: ${config.subject}</p>
          <p>Kelas: ${config.grade}</p>
          <p style="font-size: 8pt; color: #888; margin-top: 5px;">(Generated v2)</p>
        </div>
    `;

    let content = "";

    shuffledQuestions.forEach((q, idx) => {
      const isEssay = !q.options || q.options.length === 0;

      // Render components to static HTML string
      const cleanHtml = (html: string) => {
        return html
          .replace(/<annotation encoding="application\/x-tex">.*?<\/annotation>/g, '')
          .replace(/<\/?semantics>/g, '')
          .replace(/\u2061/g, '') // Remove invisible function application character
          .replace(/<span class="katex">\s*(<math[\s\S]*?<\/math>)\s*<\/span>/g, '$1'); // Unwrap span.katex
      };

      const questionHtml = cleanHtml(ReactDOMServer.renderToStaticMarkup(<LatexRenderer text={q.questionText} output="mathml" />));

      content += `
        <table class="q-table">
          <tr>
            <td class="num">${idx + 1}.</td>
            <td class="content">
              ${q.imageDescription ? `<div style="text-align:center; margin-bottom:15px; padding:10px; border:1px solid #ddd; background-color:#f8f9fa; border-radius:4px;"><p style="margin:0; font-style:italic; color:#555;"><strong>Ilustrasi Gambar:</strong> ${q.imageDescription}</p></div>` : ''}
              <div dir="auto">${questionHtml}</div>
      `;

      if (!isEssay && q.options && q.options.length > 0) {
        content += `<table class="opt-table">`;
        q.options.forEach((opt, i) => {
          const optHtml = cleanHtml(ReactDOMServer.renderToStaticMarkup(<LatexRenderer text={opt} output="mathml" />));
          content += `
              <tr>
                <td class="opt-letter">${String.fromCharCode(65 + i)}.</td>
                <td dir="auto">${optHtml}</td>
              </tr>
            `;
        });
        content += `</table>`;
      } else {
        // Essay lines
        content += `<br/><br/><hr/><br/><br/>`;
      }

      content += `
            </td>
          </tr>
        </table>
      `;
    });

    // Append Answer Key
    content += `
      <div class="page-break"></div>
      <div class="header">
        <p>KUNCI JAWABAN</p>
      </div>
      <table class="key-table">
        <thead>
          <tr>
            <th style="width: 50px;">No.</th>
            <th>Jawaban / Poin Penting</th>
          </tr>
        </thead>
        <tbody>
    `;

    shuffledQuestions.forEach((q, idx) => {
      const cleanHtml = (html: string) => {
        return html
          .replace(/<annotation encoding="application\/x-tex">.*?<\/annotation>/g, '')
          .replace(/<\/?semantics>/g, '')
          .replace(/\u2061/g, '')
          .replace(/<span class="katex">\s*(<math[\s\S]*?<\/math>)\s*<\/span>/g, '$1');
      };
      const answerHtml = cleanHtml(ReactDOMServer.renderToStaticMarkup(<LatexRenderer text={q.correctAnswer} output="mathml" />));

      content += `
          <tr>
            <td>${idx + 1}</td>
            <td>${answerHtml}</td>
          </tr>
        `;
    });

    content += `
        </tbody>
      </table>
    `;

    const footer = `</body></html>`;
    const filename = `Naskah_Soal_${sanitizeFilename(config.subject)}_Plus_Kunci.doc`;
    downloadFile(header + content + footer, filename, 'application/msword');
  };

  const handleDownloadXML = () => {
    let xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n<quiz>\n`;

    // Add a category
    xmlContent += `
  <question type="category">
    <category>
      <text>$course$/top/Soal_${sanitizeFilename(config.subject)}_${sanitizeFilename(config.grade)}</text>
    </category>
  </question>
`;

    // Helper to format text for Moodle:
    // 1. Preserve $$...$$ (Display Math) - Moodle native filter supports this
    // 2. Replace $...$ with \(...\) (Inline Math)
    // 3. Convert Markdown tables to HTML
    // 4. Replace newlines with <br/>
    const formatForMoodle = (text: string) => {
      if (!text) return "";
      let processed = text;

      // Convert Markdown tables first
      processed = markdownTableToHtml(processed);

      // We need to be careful not to touch $$...$$ when replacing $...$
      // Strategy: Split by $$...$$ and only process the parts outside

      const parts = processed.split(/(\$\$[\s\S]*?\$\$)/g);

      processed = parts.map((part, index) => {
        // If it's a $$...$$ block (odd index), return as is
        if (index % 2 === 1) return part;

        // Otherwise, process inline math $...$ -> \(...\)
        return part.replace(/\$([\s\S]*?)\$/g, '\\($1\\)');
      }).join('');

      // Replace newlines with <br/>
      processed = processed.replace(/\n/g, '<br/>');

      return processed;
    };

    shuffledQuestions.forEach((q, idx) => {
      const isEssay = !q.options || q.options.length === 0;
      const type = isEssay ? 'essay' : 'multichoice';
      const name = `Soal ${idx + 1}`;

      // Prepare Question Text with Image and Tables
      let qTextHtml = "";
      if (q.imageDescription) {
        qTextHtml += `<div style="text-align:center; margin-bottom:15px; padding:10px; border:1px solid #ddd; background-color:#f8f9fa; border-radius:4px;"><p style="margin:0; font-style:italic; color:#555;"><strong>Ilustrasi Gambar:</strong> ${q.imageDescription}</p></div>`;
      }

      qTextHtml += formatForMoodle(q.questionText);

      xmlContent += `
  <question type="${type}">
    <name>
      <text>${name}</text>
    </name>
    <questiontext format="html">
      <text><![CDATA[${qTextHtml}]]></text>
    </questiontext>
    <generalfeedback format="html">
      <text><![CDATA[${formatForMoodle(q.explanation)}]]></text>
    </generalfeedback>
    <defaultgrade>1.0000000</defaultgrade>
    <penalty>0.3333333</penalty>
    <hidden>0</hidden>
`;

      if (type === 'multichoice') {
        xmlContent += `    <single>true</single>\n    <shuffleanswers>true</shuffleanswers>\n    <answernumbering>abc</answernumbering>\n`;

        q.options!.forEach((opt, i) => {
          const optionLetter = String.fromCharCode(65 + i);
          const keyLetter = q.correctAnswer.trim().toUpperCase().charAt(0);
          const isCorrect = keyLetter === optionLetter;
          const fraction = isCorrect ? "100" : "0";

          xmlContent += `
    <answer fraction="${fraction}" format="html">
      <text><![CDATA[${formatForMoodle(opt)}]]></text>
      <feedback format="html">
        <text></text>
      </feedback>
    </answer>
`;
        });
      } else {
        // Essay
        xmlContent += `
    <responseformat>editor</responseformat>
    <responserequired>1</responserequired>
    <graderinfo format="html">
      <text><![CDATA[${formatForMoodle(q.correctAnswer)}]]></text>
    </graderinfo>
`;
      }

      xmlContent += `  </question>\n`;
    });

    xmlContent += `</quiz>`;
    const filename = `Soal_${sanitizeFilename(config.subject)}_${sanitizeFilename(config.grade)}.xml`;
    downloadFile(xmlContent, filename, 'text/xml');
  };

  const handleDownloadXMLImages = () => {
    let xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n<quiz>\n`;

    // Add a category
    xmlContent += `
  <question type="category">
    <category>
      <text>$course$/top/Soal_${sanitizeFilename(config.subject)}_${sanitizeFilename(config.grade)}_Img</text>
    </category>
  </question>
`;

    shuffledQuestions.forEach((q, idx) => {
      const isEssay = !q.options || q.options.length === 0;
      const type = isEssay ? 'essay' : 'multichoice';
      const name = `Soal ${idx + 1}`;

      // Prepare Question Text with Image and Tables
      let qTextHtml = "";
      if (q.imageDescription) {
        qTextHtml += `<div style="text-align:center; margin-bottom:15px; padding:10px; border:1px solid #ddd; background-color:#f8f9fa; border-radius:4px;"><p style="margin:0; font-style:italic; color:#555;"><strong>Ilustrasi Gambar:</strong> ${q.imageDescription}</p></div>`;
      }

      // Use latexToImg instead of formatForMoodle
      qTextHtml += latexToImg(q.questionText);

      xmlContent += `
  <question type="${type}">
    <name>
      <text>${name}</text>
    </name>
    <questiontext format="html">
      <text><![CDATA[${qTextHtml}]]></text>
    </questiontext>
    <generalfeedback format="html">
      <text><![CDATA[${latexToImg(q.explanation)}]]></text>
    </generalfeedback>
    <defaultgrade>1.0000000</defaultgrade>
    <penalty>0.3333333</penalty>
    <hidden>0</hidden>
`;

      if (type === 'multichoice') {
        xmlContent += `    <single>true</single>\n    <shuffleanswers>true</shuffleanswers>\n    <answernumbering>abc</answernumbering>\n`;

        q.options!.forEach((opt, i) => {
          const optionLetter = String.fromCharCode(65 + i);
          const keyLetter = q.correctAnswer.trim().toUpperCase().charAt(0);
          const isCorrect = keyLetter === optionLetter;
          const fraction = isCorrect ? "100" : "0";

          xmlContent += `
    <answer fraction="${fraction}" format="html">
      <text><![CDATA[${latexToImg(opt)}]]></text>
      <feedback format="html">
        <text></text>
      </feedback>
    </answer>
`;
        });
      } else {
        // Essay
        xmlContent += `
    <responseformat>editor</responseformat>
    <responserequired>1</responserequired>
    <graderinfo format="html">
      <text><![CDATA[${latexToImg(q.correctAnswer)}]]></text>
    </graderinfo>
`;
      }

      xmlContent += `  </question>\n`;
    });

    xmlContent += `</quiz>`;
    const filename = `Soal_${sanitizeFilename(config.subject)}_${sanitizeFilename(config.grade)}_Img.xml`;
    downloadFile(xmlContent, filename, 'text/xml');
  };

  const handleDownloadXMLMathML = () => {
    let xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n<quiz>\n`;

    // Add a category
    xmlContent += `
  <question type="category">
    <category>
      <text>$course$/top/Soal_${sanitizeFilename(config.subject)}_${sanitizeFilename(config.grade)}_MathML</text>
    </category>
  </question>
`;

    // Helper to convert LaTeX to MathML
    const latexToMathML = (text: string) => {
      if (!text) return "";
      let processed = text;

      // Convert Markdown tables first
      processed = markdownTableToHtml(processed);

      // Replace $$...$$ (display math)
      processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (match, tex) => {
        try {
          return katex.renderToString(tex.trim(), {
            throwOnError: false,
            output: 'mathml',
            displayMode: true
          });
        } catch (e) {
          return match;
        }
      });

      // Replace $...$ (inline math)
      processed = processed.replace(/\$([\s\S]*?)\$/g, (match, tex) => {
        try {
          return katex.renderToString(tex.trim(), {
            throwOnError: false,
            output: 'mathml',
            displayMode: false
          });
        } catch (e) {
          return match;
        }
      });

      // Replace newlines
      return processed.replace(/\n/g, '<br/>');
    };

    shuffledQuestions.forEach((q, idx) => {
      const isEssay = !q.options || q.options.length === 0;
      const type = isEssay ? 'essay' : 'multichoice';
      const name = `Soal ${idx + 1}`;

      // Prepare Question Text
      let qTextHtml = "";
      if (q.imageDescription) {
        qTextHtml += `<div style="text-align:center; margin-bottom:15px; padding:10px; border:1px solid #ddd; background-color:#f8f9fa; border-radius:4px;"><p style="margin:0; font-style:italic; color:#555;"><strong>Ilustrasi Gambar:</strong> ${q.imageDescription}</p></div>`;
      }

      qTextHtml += latexToMathML(q.questionText);

      xmlContent += `
  <question type="${type}">
    <name>
      <text>${name}</text>
    </name>
    <questiontext format="html">
      <text><![CDATA[${qTextHtml}]]></text>
    </questiontext>
    <generalfeedback format="html">
      <text><![CDATA[${latexToMathML(q.explanation)}]]></text>
    </generalfeedback>
    <defaultgrade>1.0000000</defaultgrade>
    <penalty>0.3333333</penalty>
    <hidden>0</hidden>
`;

      if (type === 'multichoice') {
        xmlContent += `    <single>true</single>\n    <shuffleanswers>true</shuffleanswers>\n    <answernumbering>abc</answernumbering>\n`;

        q.options!.forEach((opt, i) => {
          const optionLetter = String.fromCharCode(65 + i);
          const keyLetter = q.correctAnswer.trim().toUpperCase().charAt(0);
          const isCorrect = keyLetter === optionLetter;
          const fraction = isCorrect ? "100" : "0";

          xmlContent += `
    <answer fraction="${fraction}" format="html">
      <text><![CDATA[${latexToMathML(opt)}]]></text>
      <feedback format="html">
        <text></text>
      </feedback>
    </answer>
`;
        });
      } else {
        // Essay
        xmlContent += `
    <responseformat>editor</responseformat>
    <responserequired>1</responserequired>
    <graderinfo format="html">
      <text><![CDATA[${latexToMathML(q.correctAnswer)}]]></text>
    </graderinfo>
`;
      }

      xmlContent += `  </question>\n`;
    });

    xmlContent += `</quiz>`;
    const filename = `Soal_${sanitizeFilename(config.subject)}_${sanitizeFilename(config.grade)}_MathML.xml`;
    downloadFile(xmlContent, filename, 'text/xml');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200 gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">4</span>
            Naskah Soal Ujian
          </h2>
          <p className="text-sm text-gray-500 ml-10 mt-1">Siap dicetak atau diekspor ke LMS.</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end items-center relative">
          <button onClick={onBack} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium border border-gray-200 mr-auto md:mr-2">
            &larr; Kembali
          </button>

          <button
            onClick={() => setShowKey(!showKey)}
            className={`px-4 py-2 rounded-lg font-medium border transition ${showKey ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-white text-gray-600 border-gray-300'}`}
          >
            {showKey ? 'Sembunyikan Kunci' : 'Tampilkan Kunci'}
          </button>

          {/* Download Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 shadow-sm"
            >
              <span>⬇</span> Unduh Naskah <span>▼</span>
            </button>

            {showDownloadMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                <div className="py-1">
                  <button onClick={() => { handleDownloadDocx(); setShowDownloadMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700">
                    <span>📄</span> Unduh .doc (Word)
                  </button>
                  <button onClick={() => { handleDownloadDocxWithKey(); setShowDownloadMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700">
                    <span>🔑</span> Unduh .doc (Dengan Kunci)
                  </button>
                  <button onClick={() => { handleDownloadDocxImages(); setShowDownloadMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700">
                    <span>🖼️</span> Unduh .doc (Gambar)
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button onClick={() => { handleDownloadGIFT(); setShowDownloadMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700">
                    <span>⬇</span> Unduh .GIFT (Moodle)
                  </button>
                  <button onClick={() => { handleDownloadXML(); setShowDownloadMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700">
                    <span>⬇</span> Unduh .XML (Moodle)
                  </button>
                  <button onClick={() => { handleDownloadXMLImages(); setShowDownloadMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700">
                    <span>🖼️</span> Unduh .XML (Moodle Img)
                  </button>
                  <button onClick={() => { handleDownloadXMLMathML(); setShowDownloadMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700">
                    <span>∑</span> Unduh .XML (Moodle MathML)
                  </button>
                </div>
              </div>
            )}
          </div>

          <button onClick={() => window.print()} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium shadow-sm">
            🖨 Cetak
          </button>
        </div>
      </div>

      <div className="bg-white p-8 md:p-12 rounded-xl shadow-sm border border-gray-200 min-h-screen print:shadow-none print:border-none">
        {/* Kop Naskah */}
        <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
          <h1 className="text-2xl font-bold uppercase tracking-wider mb-2">Naskah Soal Ujian</h1>
          <div className="flex justify-center gap-8 text-sm font-semibold text-gray-700">
            <span>Mata Pelajaran: {config.subject}</span>
            <span>Kelas: {config.grade}</span>
            <span>Waktu: 90 Menit</span>
          </div>
        </div>

        {/* Daftar Soal */}
        <div className="space-y-8">
          {shuffledQuestions.map((q, idx) => {
            const isEssay = !q.options || q.options.length === 0;

            return (
              <div key={idx} className={`relative ${idx > 0 && idx % 4 === 0 ? 'print:break-before-page' : ''}`}>
                <div className="flex gap-3">
                  <span className="font-bold text-lg min-w-[24px]">{idx + 1}.</span>
                  <div className="flex-1">
                    {q.mermaidCode ? (
                      <div className="mb-4 overflow-x-auto">
                        <MermaidRenderer chart={q.mermaidCode} />
                      </div>
                    ) : q.imageDescription ? (
                      <div className="mb-4 p-3 bg-gray-50 border-l-4 border-gray-300 rounded-r text-sm text-gray-600 italic">
                        <span className="font-semibold not-italic mr-1">[Ilustrasi Gambar]:</span>
                        {q.imageDescription}
                      </div>
                    ) : null}
                    <div dir="auto" className="text-lg text-gray-800 mb-3 leading-relaxed">
                      <LatexRenderer text={q.questionText} />
                    </div>

                    {!isEssay && q.options && q.options.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2 ml-1">
                        {q.options.map((opt, i) => (
                          <div key={i} className="flex gap-2 group">
                            <span className="font-semibold w-6">{String.fromCharCode(65 + i)}.</span>
                            <span dir="auto" className="text-gray-700 group-hover:text-black">
                              <LatexRenderer text={opt} />
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 p-4 border-2 border-dashed border-gray-300 rounded-lg h-32 bg-gray-50 flex items-center justify-center text-gray-400 text-sm italic print:border-gray-400">
                        (Area Jawaban Siswa)
                      </div>
                    )}

                    {/* Key Display for Teacher View */}
                    {showKey && (
                      <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800 inline-block print:hidden">
                        <strong>Kunci: </strong> <span dir="auto"><LatexRenderer text={q.correctAnswer} /></span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center text-sm text-gray-400 italic print:hidden">
          --- Akhir Naskah Soal ---
        </div>
      </div>
    </div>
  );
};

export default StepFourExam;