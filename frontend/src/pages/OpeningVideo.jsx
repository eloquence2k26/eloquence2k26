import { useState, useRef, useEffect } from 'react';
import desktopVideoSrc from '../assets/lv_0_20260830212552.mp4';
import portraitVideoSrc from '../assets/lv_0_20260830212104.mp4';
import logoImg from '../assets/logo.png';

function checkIsMobileOrPortrait() {
  if (typeof window === 'undefined') return false;
  const isNarrowScreen = window.innerWidth <= 820;
  const isPortraitAspect = window.innerHeight > window.innerWidth;
  const mediaMatches = window.matchMedia('(max-width: 820px), (orientation: portrait)').matches;
  return isNarrowScreen || (isPortraitAspect && window.innerWidth < 1024) || mediaMatches;
}

export default function OpeningVideo({ onComplete }) {
  const [fading, setFading] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isMobile, setIsMobile] = useState(checkIsMobileOrPortrait);
  const videoRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(checkIsMobileOrPortrait());
    };
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const handleFinish = () => {
    if (fading || removed) return;
    try {
      sessionStorage.setItem('eloquence_intro_played', 'true');
    } catch (_) {}
    setFading(true);
    setTimeout(() => {
      setRemoved(true);
      if (videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.removeAttribute('src');
          videoRef.current.load();
        } catch (_) {}
      }
      if (onComplete) onComplete();
    }, 350);
  };

  const currentVideoSrc = isMobile ? portraitVideoSrc : desktopVideoSrc;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = false;
    video.volume = 1.0;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay with audio was blocked by browser policy; fallback to muted autoplay
        video.muted = true;
        setIsMuted(true);
        video.play().catch(() => { });
      });
    }

    const unmuteOnInteraction = () => {
      if (videoRef.current) {
        videoRef.current.muted = false;
        videoRef.current.volume = 1.0;
        videoRef.current.play().catch(() => { });
        setIsMuted(false);
      }
    };

    window.addEventListener('click', unmuteOnInteraction, { once: true });
    window.addEventListener('touchstart', unmuteOnInteraction, { once: true });
    window.addEventListener('keydown', unmuteOnInteraction, { once: true });

    return () => {
      window.removeEventListener('click', unmuteOnInteraction);
      window.removeEventListener('touchstart', unmuteOnInteraction);
      window.removeEventListener('keydown', unmuteOnInteraction);
    };
  }, [currentVideoSrc]);

  const toggleSound = (e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    video.volume = 1.0;
    if (!video.muted) {
      video.play().catch(() => { });
    }
    setIsMuted(video.muted);
  };

  if (removed) return null;

  return (
    <div
      className={`opening-video-overlay ${fading ? 'opening-video-fade-out' : ''}`}
      onClick={() => {
        if (videoRef.current) {
          videoRef.current.muted = false;
          videoRef.current.volume = 1.0;
          setIsMuted(false);
        }
      }}
    >
      <video
        key={currentVideoSrc}
        ref={videoRef}
        src={currentVideoSrc}
        autoPlay
        playsInline
        webkit-playsinline="true"
        x5-playsinline="true"
        preload="metadata"
        onEnded={handleFinish}
        onError={handleFinish}
        className="opening-video-element"
      />
      <div className="opening-video-vignette" />
      <div className="opening-hud-top">
        <img src={logoImg} alt="ELOQUENCE 26" className="opening-hud-logo" />
      </div>

      <div className="opening-hud-bottom">
        <button
          type="button"
          className={`btn ${isMuted ? 'btn-primary' : 'btn-secondary'} opening-sound-btn`}
          onClick={toggleSound}
          title="Toggle Sound"
        >
          {isMuted ? '🔊 TAP FOR SOUND' : '🔊 SOUND ON'}
        </button>
        <button
          type="button"
          className="btn btn-primary opening-skip-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleFinish();
          }}
        >
          ENTER SITE <span className="skip-arrow">→</span>
        </button>
      </div>
    </div>
  );
}
