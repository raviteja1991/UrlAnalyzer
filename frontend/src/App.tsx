import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import { API_BASE_URL } from '../config.ts'; 
import { useInView } from 'react-intersection-observer';

interface ImageInfo {
  count: number;
  size: number;
  urls: string[];
}

interface ApiResponse {
  imageTypes: Record<string, ImageInfo>;
  imageUrls: string[];
  internalLinks: string[];
  externalLinks: string[];
}

function App() {
  const [url, setUrl] = useState<string>('');
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'internal' | 'external'>('internal');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [urlHistory, setUrlHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('urlHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const [showHistory, setShowHistory] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('urlHistory', JSON.stringify(urlHistory));
  }, [urlHistory]);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const handleAnalyzeClick = async (rawUrl = url) => {
    setError('');
    setData(null);

    let inputUrl = rawUrl.trim();
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
        `${API_BASE_URL}/api/analyze-url`,
        { url: inputUrl },
        {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        setData(response.data.data);
      } else {
        setError(`Unexpected status: ${response.status}`);
      }

      // Add to history if not already present
      if (!urlHistory.includes(inputUrl)) {
        setUrlHistory(prev => [inputUrl, ...prev.slice(0, 9)]);
      }

    } catch (error: any) {
      console.error('API Error:', error);
      if (error.code === 'ECONNABORTED') {
        setError('Request timed out. The website might be too large or slow to respond.');
      } else if (error.response) {
        setError(`Error ${error.response.status}: ${error.response.data?.message || 'Unknown error'}`);
      } else if (!navigator.onLine) {
        setError('You are offline. Please check your internet connection.');
      } else {
        setError(
          error.response?.data?.message ||
          'Failed to analyze URL. Please check the URL and try again.'
        );
      }
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
    handleAnalyzeClick(linkUrl);
  };

  const downloadImage = async (imageUrl: string) => {
    try{
      const response = await fetch(imageUrl);

      if (!response.ok) {
        console.error('Failed to download image:', response.statusText);
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = imageUrl.split('/').pop() || 'image';

      document.body.appendChild(a);
      a.click();

      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }catch(error){
      console.error('Failed to download image:', error);
    }
  };

  const downloadAllImages = async (urls: string[]) => {

    // If too many images, warn the user
    if (urls.length > 10) {
      const confirm = window.confirm(`You're about to download ${urls.length} images. Continue?`);
      if (!confirm) return;
    }

    // Use a more efficient method for larger collections
    for (let i = 0; i < urls.length; i++) {
      await downloadImage(urls[i]);
      await new Promise((resolve) => setTimeout(resolve, 500)); // Delay between downloads
    }
  };

  const copyAllLinks = (links: string[]) => {
    const text = links.join('\n');
    navigator.clipboard.writeText(text)
      .then(() => {
        alert(`${links.length} links copied to clipboard!`);
      })
      .catch(err => {
        console.error('Failed to copy links: ', err);
        alert('Failed to copy links to clipboard');
      });
  };

  const getDomainFromUrl = (urlString: string) => {
    try {
      const url = new URL(urlString);
      return url.hostname;
    } catch {
      return urlString;
    }
  };

  const getPathFromUrl = (urlString: string) => {
    try {
      const url = new URL(urlString);
      return url.pathname + url.search;
    } catch {
      return '';
    }
  };

  const shareAnalysis = () => {
    if (!data) return;

    const shareText = `URL Analysis for ${url}\n` +
      `Images: ${Object.values(data.imageTypes || {}).reduce((sum, info) => sum + info.count, 0)}\n` +
      `Internal Links: ${data.internalLinks.length}\n` +
      `External Links: ${data.externalLinks.length}`;

    if (navigator.share) {
      navigator.share({
        title: 'URL Analysis',
        text: shareText,
        url: url
      }).catch(err => console.error('Error sharing:', err));
    } else {
      navigator.clipboard.writeText(shareText)
        .then(() => alert('Analysis summary copied to clipboard!'))
        .catch(err => console.error('Error copying:', err));
    }
  };

  return (
    <div className={`app-container ${darkMode ? 'dark-mode' : ''}`}>
      <div className="header-section">
        <div className="header-top">
          <h2>Analyze URL</h2>
          <button
            className="theme-toggle"
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
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
            onClick={() => handleAnalyzeClick()}
            className="analyze-button"
            disabled={isLoading}
          >
            {isLoading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>

        <div className="history-section">
          <button
            className="history-toggle"
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? 'Hide History' : 'Show History'}
          </button>

          {showHistory && urlHistory.length > 0 && (
            <div className="history-dropdown">
              {urlHistory.map((historyUrl, index) => (
                <div
                  key={index}
                  className="history-item"
                  onClick={() => {
                    setUrl(historyUrl);
                    handleAnalyzeClick(historyUrl);
                    setShowHistory(false);
                  }}
                >
                  {getDomainFromUrl(historyUrl)}
                </div>
              ))}
              <button
                className="clear-history"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Clear all history?')) {
                    setUrlHistory([]);
                    setShowHistory(false);
                  }
                }}
              >
                Clear History
              </button>
            </div>
          )}
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
            <div className="section-header">
              <h3>
                Image Details:
                <span className="section-badge">
                  {Object.values(data.imageTypes || {}).reduce((sum, info) => sum + info.count, 0)}
                </span>
              </h3>
              {Object.values(data.imageTypes || {}).length > 0 && (
                <div className='action-buttons'>
                  <button className='download-all-button' onClick={() => downloadAllImages(data.imageUrls)}
                    title="Download all images">
                    Download All
                  </button>
                  <button className='share-button' onClick={shareAnalysis}
                    title='Share Analysis Summary'>
                    Share
                  </button>
                </div>
              )}
            </div>

            {Object.keys(data.imageTypes || {}).length > 0 ? (
              <div className="image-types-grid">
                {Object.entries(data.imageTypes).map(([ext, info]) => (
                  <div key={ext} className="image-type-card">
                    <div className="image-type-header">
                      <div className="image-type-icon">{ext}</div>
                      <button
                        className="download-type-button"
                        onClick={() => {
                          if (info.urls) {
                            downloadAllImages(info.urls);
                          } else {
                            alert(`This would download all ${ext} image${info.count === 1 ? "" : "s"}`);
                          }
                        }}
                        title={`Download ${info.count === 1 ? "" : "all"} ${ext} images`}
                      >
                        Download {info.count === 1 ? "" : "All"} {ext} image{info.count === 1 ? "" : "s"}
                      </button>
                    </div>
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
                <button
                  className={`tab-button ${activeTab === 'internal' ? 'active' : ''}`}
                  onClick={() => setActiveTab('internal')}
                >
                  Internal Links
                  <span className="tab-badge">{data.internalLinks.length}</span>
                </button>
                <button
                  className={`tab-button ${activeTab === 'external' ? 'active' : ''}`}
                  onClick={() => setActiveTab('external')}
                >
                  External Links
                  <span className="tab-badge">{data.externalLinks.length}</span>
                </button>
              </div>

              <div className="tab-content">
                {activeTab === 'internal' && (
                  <>
                    {data.internalLinks.length > 0 ? (
                      <>
                        <div className='tab-actions'>
                          <button className='copy-all-button' onClick={() => copyAllLinks(data.internalLinks)}
                            title='Copy all internal links to clipboard'>
                            Copy All Links
                          </button>
                        </div>
                        <div className="card-link-grid">
                          {data.internalLinks.map((link, index) => (
                            <div key={index} className="link-card">
                              <div className="link-card-content">
                                <div className="link-favicon">
                                  <span className="material-icon">link</span>
                                </div>
                                <div className="link-details">
                                  <div className="link-path">{getPathFromUrl(link)}</div>
                                  <div className="link-domain">{getDomainFromUrl(link)}</div>
                                </div>
                              </div>
                              <div className="link-actions">
                                <button
                                  className="link-action-button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleLinkClick(link);
                                  }}
                                  title='Analyze this URL'
                                >
                                  Analyze
                                </button>
                                <a
                                  href={link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="link-action-button"
                                  title='Visit this URL'
                                >
                                  Visit
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="no-data-message">No internal links found</p>
                    )}
                  </>
                )}

                {activeTab === 'external' && (
                  <>
                    {data.externalLinks.length > 0 ? (
                      <>
                        <div className='tab-actions'>
                          <button className='copy-all-button' onClick={() => copyAllLinks(data.externalLinks)}
                            title='Copy all external links to clipboard'>
                            Copy All Links
                          </button>
                        </div>
                        <div className="card-link-grid">
                          {data.externalLinks.map((link, index) => (
                            <div key={index} className="link-card external">
                              <div className="link-card-content">
                                <div className="link-favicon">
                                  <span className="material-icon">launch</span>
                                </div>
                                <div className="link-details">
                                  <div className="link-domain">{getDomainFromUrl(link)}</div>
                                  <div className="link-path truncate">{getPathFromUrl(link)}</div>
                                </div>
                              </div>
                              <div className="link-actions">
                                <a
                                  href={link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="link-action-button"
                                  title='Visit this URL'
                                >
                                  Visit
                                </a>
                                <button
                                  className="link-action-button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(link);
                                    alert('Link copied to clipboard!');
                                  }}
                                  title='Copy this URL to clipboard'
                                >
                                  Copy
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="no-data-message">No external links found</p>
                    )}
                  </>
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