import { useState } from 'react';
import { Download } from 'lucide-react';
import Container from '../components/Container';
import SectionHeader from '../components/SectionHeader';
import Reveal from '../components/Reveal';

export default function Contact() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('submitting');
    
    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const formspreeId = import.meta.env.VITE_FORMSPREE_ID;

    if (!formspreeId) {
      console.warn('VITE_FORMSPREE_ID is not defined. Form submission simulated.');
      setTimeout(() => {
        setStatus('success');
        form.reset();
      }, 1000);
      return;
    }

    try {
      const response = await fetch(`https://formspree.io/f/${formspreeId}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        setStatus('success');
        form.reset();
      } else {
        setStatus('error');
      }
    } catch (err) {
      setStatus('error');
    }
  };

  return (
    <section id="contact" className="fluid-p-section">
      <Container>
        <Reveal>
          <SectionHeader
            label="(Get in touch)"
            headline="Got a project, role, or conversation in mind? Let's talk."
          />
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-16 flex flex-col md:flex-row fluid-gap-section">
            {/* ── Left Column: Identity Block ── */}
            <div className="flex w-full flex-col md:w-2/5">
              <div className="mb-6 h-32 w-32 overflow-hidden rounded-full border border-line">
                <img
                  src="/2026-06-05-avatar-512.jpg"
                  alt="Hirusha Dassanayaka"
                  className="h-full w-full object-cover"
                />
              </div>

              <h3 className="mb-1 font-display fluid-text-3xl font-medium tracking-tight text-fg">
                Hirusha Dassanayaka
              </h3>
              <p className="mb-8 font-mono text-sm tracking-wide text-fg-muted">
                
              </p>

              <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:gap-12">
                <div>
                  <p className="mb-1 font-mono text-xs text-fg-muted">Email</p>
                  <p className="text-sm font-medium text-fg">
                    hirushadassanayaka1@gmail.com
                  </p>
                </div>
                <div>
                  <p className="mb-1 font-mono text-xs text-fg-muted">Location</p>
                  <p className="text-sm font-medium text-fg">
                    Ingolstadt, Germany
                  </p>
                </div>
              </div>

              {/* Social & CV */}
              <div className="flex items-center gap-4">
                <a
                  href="https://linkedin.com/in/hirusha-dassanayaka"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-fg-muted transition-colors hover:text-accent"
                  aria-label="LinkedIn"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-6 w-6"
                  >
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                    <rect x="2" y="9" width="4" height="12" />
                    <circle cx="4" cy="4" r="2" />
                  </svg>
                </a>

                <a
                  href="/cv.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm font-medium text-fg transition-colors hover:bg-surface"
                >
                  <span>Download CV</span>
                  <Download className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* ── Right Column: Contact Form ── */}
            <div className="flex w-full flex-col md:w-3/5">
              <form
                className="flex flex-col gap-4"
                onSubmit={handleSubmit}
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="Your name"
                    className="w-full rounded-xl border border-line bg-bg px-4 py-3 text-sm text-fg placeholder:text-fg-subtle transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="Your email"
                    className="w-full rounded-xl border border-line bg-bg px-4 py-3 text-sm text-fg placeholder:text-fg-subtle transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <input
                  type="text"
                  name="subject"
                  placeholder="Subject (optional)"
                  className="w-full rounded-xl border border-line bg-bg px-4 py-3 text-sm text-fg placeholder:text-fg-subtle transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <textarea
                  name="message"
                  required
                  placeholder="Your message"
                  rows={5}
                  className="w-full resize-none rounded-xl border border-line bg-bg px-4 py-3 text-sm text-fg placeholder:text-fg-subtle transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                ></textarea>

                <div className="mt-2 flex items-center justify-between">
                  <div>
                    {status === 'success' && (
                      <p className="text-sm text-green-500">Thanks — I'll get back to you.</p>
                    )}
                    {status === 'error' && (
                      <p className="text-sm text-red-500">Something went wrong. Please try again.</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={status === 'submitting'}
                    className="rounded-full bg-accent px-8 py-3 text-sm font-medium text-bg transition-transform hover:-translate-y-1 hover:bg-accent-hover disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    {status === 'submitting' ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
