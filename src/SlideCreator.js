// SlideCreator.js
import React from 'react';

function SlideCreator({ 
  presentationName, 
  setPresentationName,
  creatorSlides,
  setCreatorSlides,
  creatorCurrentSlide,
  setCreatorCurrentSlide,
  handleCreatePresentation,
  uploading
}) {
  
  const handleAddSlide = () => {
    setCreatorSlides([...creatorSlides, { title: '', content: '' }]);
    setCreatorCurrentSlide(creatorSlides.length);
  };

  const handleDeleteSlide = (index) => {
    if (creatorSlides.length <= 1) {
      alert('You must have at least one slide');
      return;
    }
    const newSlides = creatorSlides.filter((_, i) => i !== index);
    setCreatorSlides(newSlides);
    if (creatorCurrentSlide >= newSlides.length) {
      setCreatorCurrentSlide(newSlides.length - 1);
    }
  };

  const handleSlideChange = (index, field, value) => {
    const newSlides = [...creatorSlides];
    newSlides[index][field] = value;
    setCreatorSlides(newSlides);
  };

  return (
    <div className="slide-creator">
      <div className="creator-header">
        <input
          type="text"
          className="presentation-name-input"
          placeholder="Enter presentation name..."
          value={presentationName}
          onChange={(e) => setPresentationName(e.target.value)}
        />
        <div className="slide-counter">
          Slide {creatorCurrentSlide + 1} / {creatorSlides.length}
        </div>
      </div>

      <div className="slide-editor">
        <div className="slide-tabs">
          {creatorSlides.map((slide, index) => (
            <div
              key={index}
              className={`slide-tab ${index === creatorCurrentSlide ? 'active' : ''}`}
              onClick={() => setCreatorCurrentSlide(index)}
            >
              <span>Slide {index + 1}</span>
              {creatorSlides.length > 1 && (
                <button
                  className="delete-tab"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSlide(index);
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button className="add-slide-btn" onClick={handleAddSlide}>
            + Add Slide
          </button>
        </div>

        <div className="slide-content">
          <input
            type="text"
            className="slide-title-input"
            placeholder="Slide Title..."
            value={creatorSlides[creatorCurrentSlide]?.title || ''}
            onChange={(e) => handleSlideChange(creatorCurrentSlide, 'title', e.target.value)}
          />
          <textarea
            className="slide-content-input"
            placeholder="Slide Content...\n\nYou can write multiple lines here.\nAdd all the details you need for this slide."
            value={creatorSlides[creatorCurrentSlide]?.content || ''}
            onChange={(e) => handleSlideChange(creatorCurrentSlide, 'content', e.target.value)}
            rows={10}
          />
        </div>

        <div className="creator-preview">
          <h4>📱 Preview:</h4>
          <div className="preview-slide">
            <h2>{creatorSlides[creatorCurrentSlide]?.title || 'Untitled Slide'}</h2>
            <p style={{ whiteSpace: 'pre-wrap' }}>
              {creatorSlides[creatorCurrentSlide]?.content || 'No content yet...'}
            </p>
          </div>
        </div>

        <button
          className="btn btn-success"
          onClick={handleCreatePresentation}
          disabled={uploading || !presentationName.trim()}
          style={{ marginTop: '20px', width: '100%', fontSize: '16px', padding: '15px' }}
        >
          {uploading ? '⏳ Creating...' : `✨ Create Presentation (${creatorSlides.length} slides)`}
        </button>
      </div>
    </div>
  );
}

export default SlideCreator;
