import React, { useState } from 'react';
import { Monitor } from 'lucide-react';
import './App.css';
import CheatsheetMaker from './components/CheatsheetMaker';

function App() {
  const [dismissMobileWarning, setDismissMobileWarning] = useState(false);

  return (
    <div className="app-container">
      {!dismissMobileWarning && (
        <div className="mobile-warning-overlay">
          <div className="mobile-warning-card">
            <div className="mobile-warning-icon-wrapper">
              <Monitor size={36} strokeWidth={1.75} />
            </div>
            <h2>Desktop Recommended</h2>
            <p>
              Vial Cheatsheet Maker is optimized for larger screens (tablets & desktops) to support layout rendering, drag-and-drop actions, and drawing flow-line paths. Using it on narrow screens may be extremely difficult.
            </p>
            <button className="mobile-warning-btn" onClick={() => setDismissMobileWarning(true)}>
              Continue Anyway
            </button>
          </div>
        </div>
      )}

      {/* Premium Top Navigation */}
      <nav className="navbar no-print">
        <div className="navbar-logo">
          <span className="logo-accent">VIAL</span>
          <span className="logo-divider">//</span>
          <span className="logo-text">Cheatsheet Maker</span>
        </div>
        <div className="navbar-links">
          <a href="https://get.vial.today/" target="_blank" rel="noopener noreferrer" className="nav-link">
            Vial Official
          </a>
          <a href="https://keyboard-layout-editor.com" target="_blank" rel="noopener noreferrer" className="nav-link">
            KLE Editor
          </a>
          <a href="https://github.com/vial-kb/vial-gui" target="_blank" rel="noopener noreferrer" className="nav-link">
            GitHub
          </a>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="main-content">
        <CheatsheetMaker />
      </main>

      {/* Modern Footer */}
      <footer className="footer no-print">
        <div className="footer-content">
          <p>© 2026 Vial Cheatsheet Maker. Built for mechanical keyboard enthusiasts.</p>
          <div className="footer-badges">
            <span className="badge">React 19</span>
            <span className="badge">Vite 8</span>
            <span className="badge">Vector SVG</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
