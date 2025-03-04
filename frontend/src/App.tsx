import { useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';
import axios from 'axios';


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
  const [url, setUrl] = useState("");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState("");

  const analyzeUrl = async () => {
    setError("");
    setData(null);

    if (!url.trim()) {
      setError("Please enter a valid URL");
      return;
    }

    try {
      const response = await axios.post<{message: string, data: ApiResponse}>("http://localhost:5000/api/analyze-url", { url });

      console.log("API Response:", response.data); // Debugging log
            
      setData(response.data.data);

    } catch (err) {

      console.error("API Error:", err);

      setError("Something went wrong. Please try again later");
    }
  }

  return (
    <div className="container">
      <h2>URL Analyzer</h2>
      <input
        type="text"
        placeholder="Enter URL..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="input-field"
      />
      <button onClick={analyzeUrl} className="analyze-button">
        Analyze
      </button>

      {error && <p className="error-message">{error}</p>}

      {data && (
        <div className="results">
          <h3>Image Details:</h3>
          {Object.entries(data.imageTypes || {}).length > 0 ? (
            Object.entries(data.imageTypes).map(([ext, info]) => (
              <p key={ext}>
                <strong>{ext}</strong>: {info.count} images, {info.size} bytes
              </p>
            ))
          ) : (<p>No image data found</p>)}

          <h3>Internal Links:</h3>
          <ul className="link-list">
            {data.internalLinks.length > 0 ? (
              data.internalLinks.map((link, index) => (
                <li key={index}>
                  <a href="#" onClick={() => setUrl(link)}>
                    {link}
                  </a>
                </li>
              ))
            ) : (<p>No internal links found</p>)}
          </ul>

          <h3>External Links:</h3>
          <ul className="link-list">
            {data.externalLinks.length > 0 ? (
              data.externalLinks.map((link, index) => (
                <li key={index}>
                  <a href={link} target="_blank" rel="noopener noreferrer">
                    {link}
                  </a>
                </li>
              ))
            ) : (
              <p>No external links found</p>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
