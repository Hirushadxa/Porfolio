import type { Experience } from '../data/experience';

interface ExperienceItemProps {
  item: Experience;
}

/**
 * Single experience entry for the vertical timeline.
 *
 * Two-column grid on desktop: period (left) + details (right).
 * Right column has a hover-activated accent left border.
 */
export default function ExperienceItem({ item }: ExperienceItemProps) {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[180px_1fr] lg:gap-16">
      {/* Left: period */}
      <span className="font-mono text-sm text-fg-subtle lg:pt-1">
        {item.period}
      </span>

      {/* Right: details with hover accent border */}
      <div className="border-l-2 border-transparent pl-4 transition-all duration-200 hover:border-accent hover:shadow-[-4px_0_15px_-5px_rgba(245,184,78,0.4)] lg:pl-6">
        <h3 className="font-display text-2xl text-fg md:text-3xl">
          {item.role}
        </h3>

        <p className="mt-1 text-fg-muted">
          {item.company} — {item.location}
        </p>

        <ul className="mt-6 space-y-4">
          {item.bullets.map((bullet) => (
            <li
              key={bullet}
              className="flex items-start gap-3 leading-relaxed text-fg-muted"
            >
              <span
                className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-accent"
                aria-hidden="true"
              />
              {bullet}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
