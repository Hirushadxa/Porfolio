import Container from '../components/Container';
import SectionHeader from '../components/SectionHeader';
import Reveal from '../components/Reveal';
import ExperienceItem from '../components/ExperienceItem';
import { experience } from '../data/experience';

export default function Experience() {
  return (
    <section id="experience" className="fluid-p-section">
      <Container>
        <Reveal>
          <SectionHeader
            label="(Experience)"
            headline="Where I've worked"
          />
        </Reveal>

        <div className="flex flex-col gap-16 md:gap-24">
          {experience.map((item, i) => (
            <Reveal key={`${item.company}-${item.period}`} delay={i * 0.08} width="full">
              <ExperienceItem item={item} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
