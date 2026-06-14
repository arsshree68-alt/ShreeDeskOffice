import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => (
  <footer className="global-footer">
    <div className="footer-container">
      <div className="footer-brand">
        <h3>ShreeDeskOffice</h3>
        <p className="footer-tagline">Premium productivity, designed for everyone.</p>
        <span className="footer-version">v3.0.0</span>
      </div>
      
      <div className="footer-links">
        <div className="link-group">
          <h4>Tools Suite</h4>
          <Link to="/pdf">PDF Suite</Link>
          <Link to="/excel">Excel Suite</Link>
          <Link to="/word">Word Suite</Link>
        </div>
        <div className="link-group">
          <h4>Information</h4>
          <Link to="/">Privacy Policy</Link>
          <Link to="/">Terms of Service</Link>
        </div>
      </div>
    </div>
    <div className="footer-bottom">
      <p>&copy; {new Date().getFullYear()} ShreeDeskOffice. Built by Abhishek Shrivastava. All processing happens locally in your browser.</p>
    </div>
  </footer>
)

export default Footer
