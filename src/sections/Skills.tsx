import Container from '../components/Container';
import SectionHeader from '../components/SectionHeader';
import Reveal from '../components/Reveal';
import SkillGroup from '../components/SkillGroup';
import { skillGroups } from '../data/skills';

export default function Skills() {
  return (
    <section id="skills" className="fluid-p-section">
      <Container>
        <Reveal>
          <SectionHeader
            label="(Toolkit)"
            headline="What I work with"
          />
        </Reveal>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,350px),1fr))] fluid-gap-section">
          {skillGroups.map((group, i) => (
            <Reveal key={group.title} delay={i * 0.08} width="full">
              <SkillGroup group={group} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
