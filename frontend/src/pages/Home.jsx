import OpeningVideo from './OpeningVideo.jsx';
import Hero from './Hero.jsx';
import Intro from './Intro.jsx';
import PatronsSection from './PatronsSection.jsx';
import StudentCoordinatorsSection from './StudentCoordinatorsSection.jsx';
import Sponsors from './Sponsors.jsx';
import LocationMap from './LocationMap.jsx';
import FinalCTA from './FinalCTA.jsx';

export default function Home({ onNavigate, hasPlayedIntro = false, onIntroComplete }) {
  const handleIntroComplete = () => {
    if (onIntroComplete) {
      onIntroComplete();
    }
  };

  const handleExploreEvents = () => {
    if (onNavigate) {
      onNavigate('events');
    }
  };

  const handleRegisterNow = () => {
    if (onNavigate) {
      onNavigate('register');
    }
  };

  return (
    <main className="home-page">
      {!hasPlayedIntro && (
        <OpeningVideo onComplete={handleIntroComplete} />
      )}
      <Hero
        onExplore={handleExploreEvents}
        onRegister={handleRegisterNow}
        hasPlayedIntro={hasPlayedIntro}
      />
      <Intro />
      <PatronsSection />
      <StudentCoordinatorsSection />
      <Sponsors />
      <LocationMap />
      <FinalCTA onRegister={handleRegisterNow} />
    </main>
  );
}
