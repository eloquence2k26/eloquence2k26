import { useRef } from 'react';

export default function ShaderCard({
  children,
  color1 = '#00a83b',
  color2 = '#39ff88',
  color3 = '#050a07',
  className = '',
  onClick,
}) {
  const containerRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (((e.clientX - rect.left) / rect.width) * 100).toFixed(1);
    const y = (((e.clientY - rect.top) / rect.height) * 100).toFixed(1);
    containerRef.current.style.setProperty('--mouse-x', `${x}%`);
    containerRef.current.style.setProperty('--mouse-y', `${y}%`);
  };

  const handleMouseEnter = () => {
    if (containerRef.current) {
      containerRef.current.classList.add('shader-card-hovered');
    }
  };

  const handleMouseLeave = () => {
    if (containerRef.current) {
      containerRef.current.classList.remove('shader-card-hovered');
      containerRef.current.style.setProperty('--mouse-x', '50%');
      containerRef.current.style.setProperty('--mouse-y', '50%');
    }
  };

  return (
    <div
      ref={containerRef}
      className={`shader-card-wrapper ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onClick={onClick}
      style={{
        '--card-c1': color1,
        '--card-c2': color2,
        '--card-c3': color3,
        '--mouse-x': '50%',
        '--mouse-y': '50%',
      }}
    >
      <div className="shader-card-cyber-bg" />
      <div className="shader-card-glass-glow" />
      <div className="shader-card-content">{children}</div>
    </div>
  );
}
