import React, { useState, useEffect } from 'react';
import './App.css';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, update, onValue } from 'firebase/database';
import JSZip from 'jszip';
import SlideCreator from './SlideCreator';


// Firebase configuration
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

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

function App() {
  const [connected, setConnected] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [sendStatus, setSendStatus] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [totalSlides, setTotalSlides] = useState(1);
  const [controlsEnabled, setControlsEnabled] = useState(false);
  const [fileInfo, setFileInfo] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [presentations, setPresentations] = useState([]);
  const [selectedPresentation, setSelectedPresentation] = useState(null);
  const [slideInterval, setSlideInterval] = useState(30);
  
  // Slide Creator States
  const [showCreator, setShowCreator] = useState(false);
  const [creatorSlides, setCreatorSlides] = useState([{ title: '', content: '' }]);
  const [presentationName, setPresentationName] = useState('');
  const [creatorCurrentSlide, setCreatorCurrentSlide] = useState(0);

  useEffect(() => {
    const connectedRef = ref(database, '.info/connected');
    const unsubscribe = onValue(connectedRef, (snap) => {
      setConnected(snap.val() === true);
    });

    const presentationRef = ref(database, 'presentation');
    const unsubscribePresentation = onValue(presentationRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setCurrentSlide(data.currentSlide || 1);
        setTotalSlides(data.totalSlides || 1);
      }
    });

    const historyRef = ref(database, 'presentations');
    const unsubscribeHistory = onValue(historyRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const presentationsList = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })).sort((a, b) => b.uploadedAt - a.uploadedAt);
        setPresentations(presentationsList);
      }
    });

    return () => {
      unsubscribe();
      unsubscribePresentation();
      unsubscribeHistory();
    };
  }, []);

  // Extract actual slide count from PPTX file
  const extractSlideCount = async (file) => {
    try {
      const zip = await JSZip.loadAsync(file);
      
      // Method 1: Count slide files in ppt/slides/
      const slideFiles = Object.keys(zip.files).filter(name => 
        name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
      );
      
      if (slideFiles.length > 0) {
        return slideFiles.length;
      }

      // Method 2: Parse presentation.xml for slide count
      const presentationXml = zip.files['ppt/presentation.xml'];
      if (presentationXml) {
        const content = await presentationXml.async('string');
        const slideIdMatches = content.match(/<p:sldId/g);
        if (slideIdMatches) {
          return slideIdMatches.length;
        }
      }

      // Fallback: estimate based on file size
      return Math.max(1, Math.floor(file.size / 50000));
    } catch (error) {
      console.error('Error extracting slide count:', error);
      // Fallback for older PPT format or errors
      return Math.max(1, Math.floor(file.size / 50000));
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      await processFile(file);
    }
  };

  const processFile = async (file) => {
    if (!file.name.match(/\.(ppt|pptx)$/i)) {
      setUploadStatus('error:Please select a PowerPoint file (.ppt or .pptx)');
      return;
    }

    setCurrentFile(file);
    setUploadStatus('success:File selected: ' + file.name);
    
    // Extract and show slide count
    setSendStatus('info:Analyzing presentation...');
    const slideCount = await extractSlideCount(file);
    
    setFileInfo({
      name: file.name,
      size: file.size,
      slides: slideCount
    });
    
    setSendStatus('success:Found ' + slideCount + ' slides in presentation!');
  };

  const handleSendToFirebase = async () => {
    if (!currentFile) return;

    setUploading(true);
    setProgress(10);
    setSendStatus('info:Converting file to base64...');

    try {
      const presentationId = 'ppt_' + Date.now();
      
      setProgress(30);
      const base64Data = await fileToBase64(currentFile);
      
      setProgress(50);
      setSendStatus('info:Extracting slide information...');
      
      const slideCount = await extractSlideCount(currentFile);
      
      setProgress(70);
      setSendStatus('info:Uploading to Firebase Database...');

      const presentationData = {
        id: presentationId,
        fileName: currentFile.name,
        fileData: base64Data,
        fileSize: currentFile.size,
        fileType: currentFile.type,
        uploadedAt: Date.now(),
        totalSlides: slideCount,
        currentSlide: 1,
        isPlaying: false,
        status: 'ready',
        slideInterval: slideInterval
      };

      setProgress(85);
      await set(ref(database, `presentations/${presentationId}`), presentationData);

      setProgress(100);
      setSendStatus('success:Presentation uploaded! ' + slideCount + ' slides detected');
      setTotalSlides(slideCount);
      setCurrentSlide(1);
      setCurrentFile(null);
      setFileInfo(null);

      setTimeout(() => {
        setProgress(0);
        setUploading(false);
      }, 2000);

    } catch (error) {
      console.error('Error uploading:', error);
      setSendStatus('error:Upload failed: ' + error.message);
      setUploading(false);
      setProgress(0);
    }
  };

  const handlePlay = async () => {
    try {
      if (!selectedPresentation) {
        setSendStatus('error:Please select a presentation first!');
        return;
      }

      await set(ref(database, 'presentation'), {
        ...selectedPresentation,
        isPlaying: true,
        status: 'playing',
        currentSlide: 1,
        slideInterval: slideInterval,
        startTime: Date.now()
      });

      setControlsEnabled(true);
      setTotalSlides(selectedPresentation.totalSlides);
      setCurrentSlide(1);
      setSendStatus('success:Presentation started on receiver with auto-slide!');
    } catch (error) {
      setSendStatus('error:' + error.message);
    }
  };

  const handleStop = async () => {
    try {
      await update(ref(database, 'presentation'), {
        isPlaying: false,
        status: 'stopped'
      });
      setSendStatus('success:Presentation stopped!');
    } catch (error) {
      setSendStatus('error:' + error.message);
    }
  };

  const handleNext = async () => {
    if (currentSlide < totalSlides) {
      const newSlide = currentSlide + 1;
      await update(ref(database, 'presentation'), {
        currentSlide: newSlide,
        startTime: Date.now()
      });
      setCurrentSlide(newSlide);
    }
  };

  const handlePrevious = async () => {
    if (currentSlide > 1) {
      const newSlide = currentSlide - 1;
      await update(ref(database, 'presentation'), {
        currentSlide: newSlide,
        startTime: Date.now()
      });
      setCurrentSlide(newSlide);
    }
  };

  const handleGoToSlide = () => {
    const slide = prompt(`Enter slide number (1-${totalSlides}):`);
    const slideNum = parseInt(slide);
    if (slideNum >= 1 && slideNum <= totalSlides) {
      update(ref(database, 'presentation'), {
        currentSlide: slideNum,
        startTime: Date.now()
      });
      setCurrentSlide(slideNum);
    }
  };

  const handleSelectPresentation = (presentation) => {
    setSelectedPresentation(presentation);
    setTotalSlides(presentation.totalSlides);
    setCurrentSlide(1);
    setControlsEnabled(true);
    setSendStatus(`success:Selected "${presentation.fileName}"`);
  };

  const handleDeletePresentation = async (presentationId) => {
    if (window.confirm('Are you sure you want to delete this presentation?')) {
      try {
        await set(ref(database, `presentations/${presentationId}`), null);
        setSendStatus('success:Presentation deleted!');
        if (selectedPresentation?.id === presentationId) {
          setSelectedPresentation(null);
          setControlsEnabled(false);
        }
      } catch (error) {
        setSendStatus('error:Failed to delete: ' + error.message);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusClass = (status) => {
    if (status.startsWith('success:')) return 'status-message success';
    if (status.startsWith('error:')) return 'status-message error';
    if (status.startsWith('info:')) return 'status-message info';
    return 'status-message';
  };

  const getStatusMessage = (status) => {
    return status.replace(/^(success|error|info):/, '');
  };

  const handleCreatePresentation = async () => {
    if (!presentationName.trim()) {
      alert('Please enter a presentation name');
      return;
    }

    const emptySlides = creatorSlides.filter(slide => !slide.title.trim() && !slide.content.trim());
    if (emptySlides.length === creatorSlides.length) {
      alert('Please add content to at least one slide');
      return;
    }

    setUploading(true);
    setSendStatus('info:Creating presentation...');
    setProgress(10);

    try {
      // Convert slides to base64 JSON
      const slidesData = creatorSlides.map((slide, index) => ({
        slideNumber: index + 1,
        title: slide.title || `Slide ${index + 1}`,
        content: slide.content || '',
        type: 'text'
      }));

      const jsonData = JSON.stringify(slidesData);
      const base64Data = btoa(unescape(encodeURIComponent(jsonData)));
      
      setProgress(50);

      const presentationId = Date.now().toString();
      const presentationData = {
        fileName: presentationName + '.custom',
        fileSize: base64Data.length,
        totalSlides: creatorSlides.length,
        uploadedAt: Date.now(),
        slideInterval: slideInterval,
        data: base64Data,
        type: 'custom'
      };

      setProgress(70);
      await set(ref(database, `presentations/${presentationId}`), presentationData);
      setProgress(100);

      setSendStatus(`success:Presentation "${presentationName}" created with ${creatorSlides.length} slides!`);
      
      // Reset creator
      setTimeout(() => {
        setShowCreator(false);
        setPresentationName('');
        setCreatorSlides([{ title: '', content: '' }]);
        setCreatorCurrentSlide(0);
        setUploading(false);
        setProgress(0);
        setSendStatus('');
      }, 2000);

    } catch (error) {
      console.error('Error creating presentation:', error);
      setSendStatus('error:Failed to create presentation: ' + error.message);
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="App">
      <header className="header">
        <h1>📡 Presentation Sender</h1>
        <div className="connection-status">
          <span className={`status-dot ${connected ? 'connected' : 'disconnected'}`}></span>
          {connected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
      </header>

      <div className="container">
        <div className="info-banner">
          <strong>ℹ️ Instructions:</strong> Upload PowerPoint → Set auto-slide interval → Send to Firebase → Select → Play on receiver
        </div>

        <div className="section">
          <h2>1. Upload or Create Presentation</h2>
          
          <div className="creator-toggle">
            <button 
              className="btn btn-primary"
              onClick={() => setShowCreator(!showCreator)}
              style={{ marginBottom: '20px' }}
            >
              {showCreator ? '📤 Upload PowerPoint' : '✏️ Create Custom Slides'}
            </button>
          </div>

          {!showCreator ? (
            <>
              <div
                className={`upload-area ${dragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('fileInput').click()}
          >
            <div className="upload-icon">📊</div>
            <p className="upload-text">Drag & Drop PowerPoint file here</p>
            <p className="upload-subtext">or click to browse</p>
            <p className="upload-formats">.ppt, .pptx</p>
            <input
              type="file"
              id="fileInput"
              accept=".ppt,.pptx"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>

          {fileInfo && (
            <div className="file-info">
              <div className="file-icon">📄</div>
              <div className="file-details">
                <strong>File Name:</strong> {fileInfo.name}<br />
                <strong>File Size:</strong> {formatFileSize(fileInfo.size)}<br />
                <strong>Slides:</strong> {fileInfo.slides} slides detected<br />
                <strong>Status:</strong> <span style={{ color: '#10b981' }}>Ready to send</span>
              </div>
            </div>
          )}

          {uploadStatus && (
            <div className={getStatusClass(uploadStatus)}>
              {getStatusMessage(uploadStatus)}
            </div>
          )}
            </>
          ) : (
            <SlideCreator
              presentationName={presentationName}
              setPresentationName={setPresentationName}
              creatorSlides={creatorSlides}
              setCreatorSlides={setCreatorSlides}
              creatorCurrentSlide={creatorCurrentSlide}
              setCreatorCurrentSlide={setCreatorCurrentSlide}
              handleCreatePresentation={handleCreatePresentation}
              uploading={uploading}
            />
          )}
        </div>

        <div className="section">
          <h2>2. Send to Firebase Database</h2>
          <p style={{ color: '#666', marginBottom: '15px' }}>
            📊 File will be stored directly in Firebase Realtime Database as base64 data
          </p>
          
          <div className="slide-interval-input">
            <label htmlFor="slideInterval">
              <strong>⏱️ Auto-Slide Interval:</strong>
            </label>
            <input
              type="number"
              id="slideInterval"
              value={slideInterval}
              onChange={(e) => setSlideInterval(parseInt(e.target.value) || 30)}
              min="5"
              max="300"
              placeholder="Seconds"
            />
            <span>seconds per slide</span>
          </div>

          <div style={{ textAlign: 'center', marginTop: '15px' }}>
            <button 
              className="btn btn-primary"
              onClick={handleSendToFirebase}
              disabled={!currentFile || uploading}
            >
              📡 Send to Firebase
            </button>
          </div>

          {uploading && (
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}>
                {progress}%
              </div>
            </div>
          )}

          {sendStatus && (
            <div className={getStatusClass(sendStatus)}>
              {getStatusMessage(sendStatus)}
            </div>
          )}
        </div>

        <div className="section">
          <h2>3. Select Presentation to Play</h2>
          <p style={{ color: '#666', marginBottom: '15px' }}>
            📚 All uploaded presentations • Select one to play on receiver
          </p>
          
          {presentations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
              No presentations uploaded yet
            </div>
          ) : (
            <div className="presentations-grid">
              {presentations.map((pres) => (
                <div 
                  key={pres.id} 
                  className={`presentation-card ${selectedPresentation?.id === pres.id ? 'selected' : ''}`}
                  onClick={() => handleSelectPresentation(pres)}
                >
                  <div className="presentation-icon">📊</div>
                  <div className="presentation-details">
                    <h4>{pres.fileName}</h4>
                    <p>Slides: {pres.totalSlides}</p>
                    <p>Size: {formatFileSize(pres.fileSize)}</p>
                    <p className="upload-date">
                      {new Date(pres.uploadedAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    className="btn-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePresentation(pres.id);
                    }}
                    title="Delete presentation"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="section">
          <h2>4. Control Presentation</h2>
          <div className="controls">
            <button 
              className="btn btn-success"
              onClick={handlePlay}
              disabled={!controlsEnabled || !selectedPresentation}
            >
              ▶️ Play with Auto-Slide
            </button>
            <button 
              className="btn btn-danger"
              onClick={handleStop}
              disabled={!controlsEnabled}
            >
              ⏹️ Stop
            </button>
            <button 
              className="btn btn-primary"
              onClick={handlePrevious}
              disabled={!controlsEnabled || currentSlide <= 1}
            >
              ⬅️ Previous
            </button>
            <button 
              className="btn btn-primary"
              onClick={handleNext}
              disabled={!controlsEnabled || currentSlide >= totalSlides}
            >
              ➡️ Next
            </button>
          </div>

          {controlsEnabled && selectedPresentation && (
            <div className="slide-info">
              <div className="slide-counter">
                Slide {currentSlide} / {totalSlides}
                <div className="auto-slide-info">
                  ⏱️ Auto-advance: {slideInterval}s
                </div>
              </div>
              <button 
                className="btn btn-primary"
                onClick={handleGoToSlide}
              >
                Go to Slide
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
