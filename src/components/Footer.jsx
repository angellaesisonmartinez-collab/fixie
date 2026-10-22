export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-content">
        <p className="footer-copyright">
          Fixie &copy; 2026 Laboratory Problem Reporting System. All rights reserved.
        </p>
        <div className="footer-links">
          <a href="#privacy" className="footer-link" onClick={(e) => e.preventDefault()}>
            Privacy Policy
          </a>
          <span className="footer-bullet" aria-hidden="true">&bull;</span>
          <a href="#help" className="footer-link" onClick={(e) => e.preventDefault()}>
            Help &amp; Support
          </a>
          <span className="footer-bullet" aria-hidden="true">&bull;</span>
          <a href="#ict-office" className="footer-link" onClick={(e) => e.preventDefault()}>
            ICT Office
          </a>
        </div>
      </div>
    </footer>
  );
}
