import { useEffect, useRef, useState } from 'react';

export default function FinalCTA({ onRegister }) {
  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationId;
    let isVisible = false;
    const particles = [];

    const resize = () => {
      if (!canvas.parentElement) return;
      canvas.width = canvas.parentElement.offsetWidth;
      canvas.height = canvas.parentElement.offsetHeight;
    };

    class Particle {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * (canvas.width || 300);
        this.y = Math.random() * (canvas.height || 300);
        this.size = Math.random() * 1.5 + 0.5;
        this.speedY = -(Math.random() * 0.3 + 0.1);
        this.opacity = Math.random() * 0.4 + 0.1;
      }
      update() {
        this.y += this.speedY;
        if (this.y < 0) this.reset();
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = '#39FF88';
        ctx.globalAlpha = this.opacity;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    resize();
    const particleCount = window.innerWidth < 768 ? 16 : 30;
    for (let i = 0; i < particleCount; i++) particles.push(new Particle());

    const animate = () => {
      if (!isVisible) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
      }
      animationId = requestAnimationFrame(animate);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) {
          cancelAnimationFrame(animationId);
          animationId = requestAnimationFrame(animate);
        } else {
          cancelAnimationFrame(animationId);
        }
      },
      { threshold: 0.05 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    window.addEventListener('resize', resize, { passive: true });
    return () => {
      cancelAnimationFrame(animationId);
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <section
      id="final-cta"
      ref={sectionRef}
      className={`final-cta ${visible ? 'final-cta-visible' : ''}`}
    >
      <canvas ref={canvasRef} className="cta-canvas" />
      <div className="cta-glow" />
      <div className="cta-content">
        <h2 className="cta-heading">ARE YOU READY?</h2>
        <p className="cta-sub">Your challenge awaits.</p>
        <button className="btn btn-primary btn-large" onClick={onRegister}>
          REGISTER FOR ELOQUENCE26
        </button>
      </div>
    </section>
  );
}
