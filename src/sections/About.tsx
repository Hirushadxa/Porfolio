import Container from '../components/Container';
import SectionHeader from '../components/SectionHeader';
import Reveal from '../components/Reveal';

export default function About() {
  return (
    <section id="about" className="py-24 md:py-32">
      <Container>
        <Reveal>
          <SectionHeader
            label="(About)"
            headline="Tech-fluent. Business-minded. Detail-obsessed."
          />
        </Reveal>

        <div className="max-w-2xl space-y-6">
          <Reveal delay={0.08}>
            <p className="text-base leading-relaxed text-fg-muted md:text-lg">
              I'm a 5th-semester Digital Technology &amp; Management student at
              OTH Amberg-Weiden, where I'm learning to operate at the
              intersection of engineering and strategy. My academic focus spans
              IoT and sensor technology, applied AI and computer vision in smart
              factories, BI and data modelling, and the business processes that
              translate technology into outcomes.
            </p>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="text-base leading-relaxed text-fg-muted md:text-lg">
              Before Germany, I worked at Singer Sri Lanka PLC as a Junior
              Executive in IT, where I learned that the difference between a good
              system and a useful one is whoever's sitting in front of it. That
              stuck with me — I now build with users in mind, whether it's a
              Power BI dashboard, a smart-camera quality station, or a freelance
              website.
            </p>
          </Reveal>

          <Reveal delay={0.24}>
            <p className="font-mono text-sm tracking-wide md:text-base">
              <span className="text-accent">EN</span>
              <span className="text-fg-muted"> — C1</span>
              <span className="mx-2 text-fg-subtle">·</span>
              <span className="text-accent">DE</span>
              <span className="text-fg-muted"> — B2</span>
              <span className="mx-2 text-fg-subtle">·</span>
              <span className="text-accent">SI</span>
              <span className="text-fg-muted"> — Native</span>
            </p>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
