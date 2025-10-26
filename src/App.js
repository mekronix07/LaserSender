import React, { useState, useEffect } from 'react';
import './App.css';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';
import PDFViewer from './PDFViewer';

// Firebase configuration - REPLACE WITH YOUR CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyCp-LfozVypM0zyzoeFJRMPHZV3FIANfFY",
  authDomain: "laser-scanner-fa514.firebaseapp.com",
  databaseURL: "https://laser-scanner-fa514-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "laser-scanner-fa514",
  storageBucket: "laser-scanner-fa514.firebasestorage.app",
  messagingSenderId: "476242080920",
  appId: "1:476242080920:web:2e7aa5c5a65c5bcccdcced",
  measurementId: "G-KPJFQZ37SJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

function App() {
  const [connected, setConnected] = useState(false);
  const [presentation, setPresentation] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [totalSlides, setTotalSlides] = useState(1);
  const [status, setStatus] = useState('waiting');
  const [fileName, setFileName] = useState('No file loaded');
  const [showPresentation, setShowPresentation] = useState(false);
  const [customSlides, setCustomSlides] = useState(null);
  const [binaryColumns, setBinaryColumns] = useState([]);

  // Generate binary rain effect
  useEffect(() => {
    const columns = [];
    const numColumns = Math.floor(window.innerWidth / 30);
    
    for (let i = 0; i < numColumns; i++) {
      columns.push({
        id: i,
        left: i * 30,
        delay: Math.random() * 5,
        duration: 10 + Math.random() * 10,
        content: generateBinaryString()
      });
    }
    
    setBinaryColumns(columns);
    
    // Regenerate binary strings periodically
    const interval = setInterval(() => {
      setBinaryColumns(prev => prev.map(col => ({
        ...col,
        content: generateBinaryString()
      })));
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const generateBinaryString = () => {
    let binary = '';
    for (let i = 0; i < 30; i++) {
      binary += Math.random() > 0.5 ? '1' : '0';
      if (i % 8 === 7) binary += '\n';
    }
    return binary;
  };

  useEffect(() => {
    // Check Firebase connection
    const connectedRef = ref(database, '.info/connected');
    const unsubscribeConnection = onValue(connectedRef, (snap) => {
      setConnected(snap.val() === true);
    });

    // Listen to presentation data
    const presentationRef = ref(database, 'presentation');
    const unsubscribePresentation = onValue(presentationRef, (snapshot) => {
      const data = snapshot.val();
      
      if (data) {
        setPresentation(data);
        setCurrentSlide(data.currentSlide || 1);
        setTotalSlides(data.totalSlides || 1);
        setStatus(data.status || 'ready');
        setFileName(data.fileName || 'Presentation');
        
        // Handle custom slides
        if (data.type === 'custom' && data.data) {
          try {
            const jsonData = decodeURIComponent(escape(atob(data.data)));
            const slides = JSON.parse(jsonData);
            setCustomSlides(slides);
          } catch (error) {
            console.error('Error parsing custom slides:', error);
            setCustomSlides(null);
          }
        } else {
          setCustomSlides(null);
        }
        
        // Show presentation ONLY if playing
        if (data.status === 'playing') {
          setShowPresentation(true);
        } else {
          setShowPresentation(false);
        }
      } else {
        setShowPresentation(false);
        setStatus('waiting');
        setFileName('No file loaded');
        setCustomSlides(null);
      }
    });

    return () => {
      unsubscribeConnection();
      unsubscribePresentation();
    };
  }, []);

  // Auto-slide effect
  useEffect(() => {
    if (!presentation || presentation.status !== 'playing' || !presentation.slideInterval) {
      return;
    }

    const slideInterval = presentation.slideInterval * 1000;
    const startTime = presentation.startTime || Date.now();
    const elapsed = Date.now() - startTime;
    const targetSlide = Math.min(
      Math.floor(elapsed / slideInterval) + 1,
      presentation.totalSlides
    );

    if (targetSlide !== currentSlide && targetSlide <= presentation.totalSlides) {
      setCurrentSlide(targetSlide);
    }

    const timer = setInterval(() => {
      setCurrentSlide(prev => {
        const nextSlide = prev + 1;
        if (nextSlide <= presentation.totalSlides) {
          return nextSlide;
        }
        return prev;
      });
    }, slideInterval);

    return () => clearInterval(timer);
  }, [presentation, currentSlide]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && document.fullscreenElement) {
        document.exitFullscreen();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const getTemplateClass = (slideNum) => {
    const templateNum = ((slideNum - 1) % 5) + 1;
    return `slide-template-${templateNum}`;
  };

  const getCustomSlideContent = (slideNum) => {
    if (customSlides && customSlides.length > 0) {
      const slide = customSlides[slideNum - 1];
      if (slide) {
        return { title: slide.title, content: slide.content };
      }
    }
    return null;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="App">
      {/* Matrix Binary Rain Background */}
      <div className="matrix-rain">
        {binaryColumns.map(col => (
          <div
            key={col.id}
            className="binary-column"
            style={{
              left: `${col.left}px`,
              animationDelay: `${col.delay}s`,
              animationDuration: `${col.duration}s`
            }}
          >
            {col.content}
          </div>
        ))}
      </div>

      {/* Cyber Grid Overlay */}
      <div className="cyber-grid"></div>

      {/* Corner Decorations */}
      <div className="corner-decoration corner-tl"></div>
      <div className="corner-decoration corner-tr"></div>
      <div className="corner-decoration corner-bl"></div>
      <div className="corner-decoration corner-br"></div>

      {/* Connection Status */}
      <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
        {connected ? '🟢 CONNECTED' : '🔴 DISCONNECTED'}
      </div>

      <div className="fullscreen-container" onDoubleClick={toggleFullscreen}>
        {!showPresentation ? (
          <div className="waiting-screen">
            <div className="waiting-message">
              <h1>⚡ LASER SCANNER SYSTEM ⚡</h1>
              
              <div className="loading-spinner"></div>
              
              <div className="scanner-status">
                <div className="status-line connecting">
                  &gt; CONNECTING TO SERVER...
                </div>
                <div className="status-line">
                  &gt; WAITING FOR LASER SCANNER
                </div>
                <div className="status-line">
                  &gt; SYSTEM STATUS: STANDBY
                </div>
              </div>
              
              <div className="cyber-text">
                ▓▓▓▓▓ READY TO RECEIVE ▓▓▓▓▓
              </div>
              
              <div className="cyber-text" style={{ marginTop: '20px', fontSize: '14px', opacity: 0.6 }}>
                {connected ? '// FIREBASE LINK ESTABLISHED //' : '// ESTABLISHING CONNECTION //'}
              </div>
            </div>
          </div>
        ) : (
          <div className="presentation-display">
            {presentation?.isPdf && presentation?.pdfData ? (
              <PDFViewer 
                pdfData={presentation.pdfData}
                pageNumber={currentSlide}
                onPageCount={(count) => {
                  if (count !== totalSlides) {
                    setTotalSlides(count);
                  }
                }}
              />
            ) : (
              <>
                {customSlides ? (
                  <div className={`slide-content ${getTemplateClass(currentSlide)}`}>
                    {(() => {
                      const slideData = getCustomSlideContent(currentSlide);
                      return slideData ? (
                        <>
                          <h1>{slideData.title}</h1>
                          <p style={{ whiteSpace: 'pre-wrap' }}>
                            {slideData.content}
                          </p>
                        </>
                      ) : (
                        <>
                          <h1>SLIDE {currentSlide}</h1>
                          <p>NO CONTENT</p>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className={`slide-content ${getTemplateClass(currentSlide)}`}>
                    <h1>SLIDE {currentSlide}</h1>
                    <p>SLIDE {currentSlide} OF {totalSlides}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {showPresentation && (
        <div className="carbon-laser-footer">
          <div className="laser-info">
            <span className="laser-icon">🔬</span>
            <span className="laser-text">CARBON DATING LASER SYSTEM</span>
          </div>
          <div className="laser-status">
            <span className="status-dot"></span>
            <span>LASER ACTIVE</span>
          </div>
          <div className="laser-data">
            <span>C-14 ISOTOPE DETECTION</span>
            <span className="separator">|</span>
            <span>PRECISION: 99.7%</span>
            <span className="separator">|</span>
            <span>FREQ: 2.4 GHz</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
