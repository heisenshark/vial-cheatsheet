import React from 'react';
import './App.css';
import CheatsheetMaker from './CheatsheetMaker';

function App() {
  return (
    <div className="app-container">
      {/* Premium Top Navigation */}
      <nav className="navbar">
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
      <footer className="footer">
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
