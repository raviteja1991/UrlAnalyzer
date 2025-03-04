import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

interface ImageInfo {
  count: number;
  size: number;
}

interface ApiResponse {
  imageTypes: Record<string, ImageInfo>;
  internalLinks: string[];
  externalLinks: string[];
}

function App() {
  const [url, setUrl] = useState<string>('');
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const handleAnalyzeClick = async () => {
    setError('');
    setData(null);

    let inputUrl = url.trim();
    if (!inputUrl) {
      setError('Please enter a valid URL');
      return;
    }

    // Ensure full URL with protocol
    inputUrl = inputUrl.match(/^https?:\/\//i) 
      ? inputUrl 
      : `https://${inputUrl}`;

    setUrl(inputUrl);
    setIsLoading(true);

    try {
      const response = await axios.post<{ message: string, data: ApiResponse }>(
        'http://localhost:5000/api/analyze-url',
        { url: inputUrl },
        { 
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      setData(response.data.data);
    } catch (error: any) {
      console.error('API Error:', error);
      setError(
        error.response?.data?.message || 
        'Something went wrong. Please try again later'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAnalyzeClick();
    }
  };

  const handleLinkClick = (linkUrl: string) => {
    setUrl(linkUrl);
    handleAnalyzeClick();
  };

  return (
    <div className="app-container">
      <div className="header-section">
        <h2>URL Analyzer</h2>
        <p className="subtitle">Analyze images and links from any web page</p>
      </div>

      <div className="input-section">
        <div className="url-input-container">
          <input
            type="text"
            placeholder="Enter URL (e.g., example.com)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyPress={handleKeyPress}
            className="url-input"
            disabled={isLoading}
          />
          <button 
            onClick={handleAnalyzeClick} 
            className="analyze-button" 
            disabled={isLoading}
          >
            {isLoading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
        {error && <p className="error-message">{error}</p>}
      </div>

      {isLoading && (
        <div className="loading-section">
          <div className="loader"></div>
          <p>Fetching and analyzing the URL...</p>
        </div>
      )}

      {data && (
        <div className="results-container">
          <div className="results-section images-section">
            <h3>
              Image Details: 
              <span className="section-badge">
                {Object.values(data.imageTypes || {}).reduce((sum, info) => sum + info.count, 0)}
              </span>
            </h3>
            {Object.keys(data.imageTypes || {}).length > 0 ? (
              <div className="image-types-grid">
                {Object.entries(data.imageTypes).map(([ext, info]) => (
                  <div key={ext} className="image-type-card">
                    <div className="image-type-icon">{ext}</div>
                    <div className="image-type-details">
                      <span className="image-count">
                        {info.count} image{info.count !== 1 ? 's' : ''}
                      </span>
                      <span className="image-size">{formatBytes(info.size)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data-message">No images found on this page</p>
            )}
          </div>

          <div className="results-section links-section">
            <div className="tabs">
              <div className="tab-header">
                <h2>
                  Internal Links 
                  <span className="section-badge">{data.internalLinks.length}</span>
                </h2>
              </div>
              <div className="tab-content">
                {data.internalLinks.length > 0 ? (
                  <ul className="link-list">
                    {data.internalLinks.map((link, index) => (
                      <li key={index} className="link-item">
                        <a 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault();
                            handleLinkClick(link);
                          }}
                          className="internal-link"
                        >
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="no-data-message">No internal links found</p>
                )}
              </div>
            </div>

            <div className="tabs">
              <div className="tab-header">
                <h2>
                  External Links 
                  <span className="section-badge">{data.externalLinks.length}</span>
                </h2>
              </div>
              <div className="tab-content">
                {data.externalLinks.length > 0 ? (
                  <ul className="link-list">
                    {data.externalLinks.map((link, index) => (
                      <li key={index} className="link-item">
                        <a 
                          href={link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="external-link"
                        >
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="no-data-message">No external links found</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;