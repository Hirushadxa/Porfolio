interface SectionHeaderProps {
  /** Small mono label displayed above the headline, e.g. "(About)" */
  label: string;
  /** Large display headline */
  headline: string;
}

/**
 * Section header with a small mono label and a large display heading.
 * Spec: label in mono/muted, headline in Instrument Serif display font.
 */
export default function SectionHeader({ label, headline }: SectionHeaderProps) {
  return (
    <div className="mb-10 md:mb-16 space-y-4">
      <span className="font-mono text-sm tracking-wider text-fg-subtle">
        {label}
      </span>
      <h2 className="font-display text-3xl leading-tight text-fg sm:text-4xl md:text-5xl lg:text-6xl">
        {headline}
      </h2>
    </div>
  );
}
