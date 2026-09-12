import { useEffect, useRef, useState } from 'react';
import cahcetAbout from '../assets/cahcet_about.jpeg';

export default function Intro() {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="intro"
      ref={sectionRef}
      className={`intro ${visible ? 'intro-visible' : ''}`}
    >
      <div className="intro-container">
        <div className="intro-left">
          <h2 className="intro-heading">About the Event</h2>
          <p className="intro-desc">
            Dive into coding challenges, paper presentations, design, quizzes, gaming and more. Eloquence'26 brings students from across India to learn, build, and have fun.
          </p>
          <p className="intro-desc">
            Experience a vibrant atmosphere where innovation meets inspiration. Participate in hands-on workshops, showcase your skills in competitive events, and connect with industry experts and fellow tech enthusiasts. Whether you are a coder, designer, gamer, or simply passionate about technology, Eloquence'26 offers something for everyone.
          </p>
          <p className="intro-desc">
            Join us for a day filled with knowledge sharing, creativity, and excitement. Unlock new opportunities, win exciting prizes, and make memories that last a lifetime!
          </p>
        </div>
        <div className="intro-right">
          <div className="intro-image-wrapper">
            <img src={cahcetAbout} alt="CAHCET" className="intro-image" loading="lazy" decoding="async" />
            <p className="intro-venue">Venue: C Abdul Hakeem College of Engineering and Technology, Melvisharam, Ranipet District</p>
          </div>
        </div>
      </div>
    </section>
  );
}
