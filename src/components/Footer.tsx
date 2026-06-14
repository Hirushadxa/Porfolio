import Container from './Container';

export default function Footer() {
  return (
    <footer className="border-t border-line py-12">
      <Container>
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          {/* Left: copyright */}
          <p className="font-mono text-xs text-fg-subtle">
            © 2026 Hirusha Dassanayaka. Built with React + Vite.
          </p>
        </div>
      </Container>
    </footer>
  );
}
