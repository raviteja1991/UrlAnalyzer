# URL Analyzer

## Overview
A full-stack web application to analyze web pages, extracting image details and categorizing links.

## Features
- Input any URL for analysis
- Retrieve image statistics (count, size by extension)
- Categorize links into internal and external
- Recursive link analysis
- Responsive design

## Technology Stack
- Frontend: React, TypeScript
- Backend: Node.js, Express
- Libraries: Axios, Cheerio

## Prerequisites
- Node.js (v14+)
- npm

## Installation

1. Clone the repository
```bash
git clone <your-repo-url>
cd url-analyzer
```

2. Install dependencies
```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

3. Run the application
```bash
# Start frontend and backend concurrently
npm run start
```

## Configuration
- Frontend runs on `http://localhost:3000`
- Backend runs on `http://localhost:5000`

## Potential Improvements
- Add request rate limiting
- Implement more robust error handling
- Add caching mechanism
- Enhance link analysis depth

## License
MIT License
