import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, Sun, Moon } from 'lucide-react';
import Container from './Container';

const NAV_LINKS = [
  { label: 'Home', href: '#hero' },
  { label: 'About', href: '#about' },
  { label: 'Work', href: '#work' },
  { label: 'Experience', href: '#experience' },
  { label: 'Contact', href: '#contact' },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cinematicActive, setCinematicActive] = useState(true);

  const [isLight, setIsLight] = useState(false);
  const [lang, setLang] = useState('EN');

  useEffect(() => {
    if (isLight) document.documentElement.classList.add('light');
    else document.documentElement.classList.remove('light');
  }, [isLight]);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 80);
      
      const isMobileViewport = window.innerWidth < 1024;
      // On mobile viewports, there's no cinematic sticky zoom intro, so the navbar
      // should never be hidden (cinematicActive = false).
      // On desktop, it is hidden for the first 600px of scrolling.
      setCinematicActive(isMobileViewport ? false : y < 600);
    };
    onScroll(); // read initial position
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // Lock body scroll and hide main content when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.classList.add('mobile-menu-open');
    } else {
      document.body.style.overflow = '';
      document.documentElement.classList.remove('mobile-menu-open');
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.classList.remove('mobile-menu-open');
    };
  }, [menuOpen]);

  return (
    <nav
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? 'border-b border-line bg-surface/80 backdrop-blur-md' : 'border-b border-transparent'
      }`}
      style={{
        pointerEvents: cinematicActive ? 'none' : 'auto',
      }}
    >
      <Container>
        <div className="flex items-center justify-between py-4">
          {/* Monogram */}
          <a
            href="#hero"
            className="font-display text-2xl text-accent transition-colors duration-200 hover:text-accent-hover"
          >
            HD
          </a>

          {/* Desktop links */}
          <div className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link, i) => (
              <span key={link.href} className="flex items-center">
                {i > 0 && (
                  <span className="mx-2 text-fg-subtle" aria-hidden="true">
                    ·
                  </span>
                )}
                <a
                  href={link.href}
                  className="font-mono text-sm text-fg-muted transition-colors duration-200 hover:text-fg"
                >
                  {link.label}
                </a>
              </span>
            ))}
            
            {/* Controls */}
            <div className="ml-4 flex items-center gap-4 border-l border-line pl-4">
              <button
                type="button"
                className="text-fg-muted transition-colors duration-200 hover:text-accent"
                onClick={() => setLang(l => (l === 'EN' ? 'DE' : 'EN'))}
                aria-label="Toggle Language"
              >
                <span className="font-mono text-sm font-bold">{lang}</span>
              </button>
              <button
                type="button"
                className="text-fg-muted transition-colors duration-200 hover:text-accent"
                onClick={() => setIsLight(l => !l)}
                aria-label="Toggle Theme"
              >
                {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="text-fg-muted transition-colors duration-200 hover:text-fg lg:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </Container>

      {/* Mobile overlay — portaled to body to escape nav's backdrop-filter containing block */}
      {createPortal(
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              className="fixed inset-0 z-50 flex flex-col bg-transparent lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {/* Close button */}
              <div className="flex justify-end px-6 py-4">
                <button
                  type="button"
                  className="text-fg-muted transition-colors duration-200 hover:text-fg p-2"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close navigation menu"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Links */}
              <div className="flex flex-1 flex-col items-center justify-center fluid-gap-items">
                {NAV_LINKS.map((link, i) => (
                  <motion.a
                    key={link.href}
                    href={link.href}
                    className="font-display fluid-text-4xl text-fg-muted transition-colors duration-200 hover:text-fg"
                    onClick={() => setMenuOpen(false)}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.3 }}
                  >
                    {link.label}
                  </motion.a>
                ))}
                
                <motion.div
                  className="mt-8 flex items-center gap-6 border-t border-line pt-8"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                >
                  <button
                    type="button"
                    className="flex items-center gap-2 font-mono text-lg text-fg-muted transition-colors duration-200 hover:text-accent"
                    onClick={() => setLang(l => (l === 'EN' ? 'DE' : 'EN'))}
                  >
                    {lang}
                  </button>
                  <span className="text-line">|</span>
                  <button
                    type="button"
                    className="flex items-center gap-2 text-fg-muted transition-colors duration-200 hover:text-accent"
                    onClick={() => setIsLight(l => !l)}
                  >
                    {isLight ? <Moon className="h-6 w-6" /> : <Sun className="h-6 w-6" />}
                  </button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </nav>
  );
}
