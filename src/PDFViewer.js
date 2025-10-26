import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

function PDFViewer({ pdfData, pageNumber, onPageCount }) {
  const canvasRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [error, setError] = useState(null);

  // Load PDF document
  useEffect(() => {
    if (!pdfData) return;

    const loadPDF = async () => {
      try {
        // Convert base64 to Uint8Array
        const pdfDataUri = `data:application/pdf;base64,${pdfData}`;
        const loadingTask = pdfjsLib.getDocument(pdfDataUri);
        const pdf = await loadingTask.promise;
        
        setPdfDoc(pdf);
        if (onPageCount) {
          onPageCount(pdf.numPages);
        }
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError('Failed to load PDF: ' + err.message);
      }
    };

    loadPDF();
  }, [pdfData, onPageCount]);

  // Render current page
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        // Calculate scale to fit container
        const container = canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        const viewport = page.getViewport({ scale: 1 });
        const scale = Math.min(
          containerWidth / viewport.width,
          containerHeight / viewport.height
        ) * 0.95; // 95% to add some padding

        const scaledViewport = page.getViewport({ scale });

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        const renderContext = {
          canvasContext: context,
          viewport: scaledViewport
        };

        await page.render(renderContext).promise;
      } catch (err) {
        console.error('Error rendering page:', err);
        setError('Failed to render page: ' + err.message);
      }
    };

    renderPage();
  }, [pdfDoc, pageNumber]);

  if (error) {
    return (
      <div style={{ 
        color: 'white', 
        padding: '20px', 
        textAlign: 'center' 
      }}>
        <h2>Error Loading PDF</h2>
        <p>{error}</p>
        <p style={{ marginTop: '20px', fontSize: '0.9em', opacity: 0.7 }}>
          Make sure the conversion server is running
        </p>
      </div>
    );
  }

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      background: '#1a1a1a'
    }}>
      <canvas 
        ref={canvasRef} 
        style={{ 
          maxWidth: '100%', 
          maxHeight: '100%',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
        }} 
      />
    </div>
  );
}

export default PDFViewer;
