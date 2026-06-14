import Container from '../components/Container';
import SectionHeader from '../components/SectionHeader';
import Reveal from '../components/Reveal';
import ProjectCard from '../components/ProjectCard';
import { projects } from '../data/projects';

export default function Work() {
  return (
    <section id="work" className="fluid-p-section">
      <Container>
        <Reveal>
          <SectionHeader
            label="(Selected work)"
            headline="Projects I've built"
          />
        </Reveal>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,350px),1fr))] fluid-gap-section">
          {projects.map((project, i) => (
            <Reveal
              key={project.slug}
              delay={i * 0.08}
              width="full"
              className={project.featured ? 'md:col-span-2' : ''}
            >
              <ProjectCard project={project} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
