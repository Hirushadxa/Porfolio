import type { SkillGroup as SkillGroupType } from '../data/skills';

interface SkillGroupProps {
  group: SkillGroupType;
}

/**
 * Grouped skill chips with a mono category title.
 * Title wrapped in parens, e.g. "(Data & BI)".
 * Chips are pill-shaped with border-line and surface background.
 */
export default function SkillGroup({ group }: SkillGroupProps) {
  return (
    <div>
      <h3 className="mb-4 font-mono text-sm tracking-wider text-fg-subtle">
        ({group.title})
      </h3>

      <div className="flex flex-wrap gap-2">
        {group.items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-line bg-transparent px-3 py-1 text-sm text-fg-muted transition-all duration-200 hover:border-accent hover:text-accent hover:shadow-[0_0_10px_rgba(245,184,78,0.3)] cursor-default"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
