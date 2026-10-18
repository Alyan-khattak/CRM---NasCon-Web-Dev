"use client";

import styles from "./RippleWaves.module.css";

interface RippleWavesProps {
  centerY?: string; // e.g. "top", "center", "0%", "50%"
  className?: string;
}

export default function RippleWaves({ centerY = "center", className = "" }: RippleWavesProps) {
  return (
    <div className={`${styles.rippleContainer} ${className}`} data-center={centerY}>
      <svg
        className={styles.rippleSvg}
        viewBox="0 0 1400 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Main radial background gradient - Monochrome */}
          <radialGradient id="rippleBgGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="30%" stopColor="#f0f0f0" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#e5e5e5" stopOpacity="0.5" />
            <stop offset="85%" stopColor="#f7f7f7" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>

          {/* Wave ring stroke gradient - Monochromatic Black / Charcoal */}
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#181818" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#000000" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#65717c" stopOpacity="0.18" />
          </linearGradient>

          {/* Soft blur filter for organic wave depth */}
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <filter id="deepBlur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="16" />
          </filter>
        </defs>

        {/* Ambient radial lighting glow */}
        <rect width="100%" height="100%" fill="url(#rippleBgGrad)" />

        <g className={styles.waveGroup} transform="translate(700, 450)">
          {/* Concentric Wave Rings with staggered pulses */}
          <circle r="60" className={`${styles.waveRing} ${styles.ring1}`} />
          <circle r="110" className={`${styles.waveRing} ${styles.ring2}`} />
          <circle r="170" className={`${styles.waveRing} ${styles.ring3}`} />
          <circle r="240" className={`${styles.waveRing} ${styles.ring4}`} />
          <circle r="320" className={`${styles.waveRing} ${styles.ring5}`} />
          <circle r="410" className={`${styles.waveRing} ${styles.ring6}`} />
          <circle r="510" className={`${styles.waveRing} ${styles.ring7}`} />
          <circle r="620" className={`${styles.waveRing} ${styles.ring8}`} />
          <circle r="740" className={`${styles.waveRing} ${styles.ring9}`} />

          {/* Blurred highlight wave rings for 3D depth */}
          <circle r="200" className={`${styles.glowRing} ${styles.glow1}`} filter="url(#softGlow)" />
          <circle r="380" className={`${styles.glowRing} ${styles.glow2}`} filter="url(#softGlow)" />
          <circle r="580" className={`${styles.glowRing} ${styles.glow3}`} filter="url(#deepBlur)" />
        </g>
      </svg>
    </div>
  );
}
