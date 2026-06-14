import type { Project } from '../data/projects';

interface ProjectCardProps {
  project: Project;
}

/**
 * Card for displaying a project in the Work section grid.
 *
 * Layout: rounded-xl card with year/role header, title, subtitle,
 * description, tech tags, and optional live URL CTA.
 * Hover: border shifts from line → accent-dim.
 */
export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <article
      className={
        'group rounded-xl border border-line bg-transparent p-6 transition-all duration-200 hover:-translate-y-1 hover:border-accent hover:shadow-[0_0_15px_rgba(245,184,78,0.3)] md:p-8'
      }
    >
      {/* Featured label */}
      {project.featured && (
        <span className="mb-3 inline-block font-mono text-xs tracking-wider text-accent">
          · Featured project
        </span>
      )}

      {/* Top row: year + role */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <span className="font-mono text-xs text-fg-subtle">{project.year}</span>
        <span className="font-mono text-xs text-fg-muted">{project.role}</span>
      </div>

      {/* Title */}
      <h3 className="font-display text-2xl text-fg sm:text-3xl md:text-4xl">
        {project.title}
      </h3>

      {/* Subtitle */}
      <p className="mt-1 text-lg text-fg-muted">{project.subtitle}</p>

      {/* Description */}
      <p className="mt-4 leading-relaxed text-fg-muted">{project.description}</p>

      {/* Tags */}
      <div className="mt-6 flex flex-wrap gap-2">
        {project.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-line bg-bg px-3 py-1 text-xs text-fg-muted"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Live URL CTA */}
      {project.liveUrl && (
        <a
          href={project.liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block font-mono text-sm text-accent transition-colors duration-200 hover:text-accent-hover"
        >
          View live ↗
        </a>
      )}
    </article>
  );
}
