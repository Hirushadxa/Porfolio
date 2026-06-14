import Nav from './components/Nav';
import Footer from './components/Footer';
import CurtainLoader from './components/CurtainLoader';
import SmoothScroll from './components/SmoothScroll';
import CinematicIntro from './sections/CinematicIntro';
import Work from './sections/Work';
import Experience from './sections/Experience';
import Skills from './sections/Skills';
import Contact from './sections/Contact';
import Background3D from './components/Background3D';
import MaskedContent from './components/MaskedContent';

function App() {
  return (
    <SmoothScroll>
      {/* Global 3D Background */}
      <div className="fixed inset-0 z-[-2] overflow-hidden pointer-events-none">
        <Background3D />
      </div>

      <CurtainLoader />
      <Nav />
      <main>
        <CinematicIntro />
        
        {/* Content layered on top of the 3D background */}
        <MaskedContent className="relative z-10 pointer-events-auto">
          <Work />
          <Experience />
          <Skills />
          <Contact />
        </MaskedContent>
      </main>
      <Footer />
    </SmoothScroll>
  );
}

export default App;
