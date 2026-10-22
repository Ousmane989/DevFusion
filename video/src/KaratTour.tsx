import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

// ------------------------------------------------------------------
// Visite guidée Karat — 16 s en boucle, uniquement de VRAIES captures de la
// plateforme (boutique de démonstration « Maison Awa »).
// ------------------------------------------------------------------
export const TOUR_FRAMES = 480;
const SCENE = 120;
const GOLD = '#d4af37';
const GOLD_GRAD = 'linear-gradient(120deg, #d4af37 0%, #f5d77e 55%, #d4af37 100%)';
const cap = (f: string) => staticFile('caps/' + f);
const ease = Easing.bezier(0.16, 1, 0.3, 1);

const Fonts: React.FC = () => (
  <style>{`
    @font-face { font-family: 'Cormorant Garamond'; font-weight: 600; src: url(${staticFile('fonts/CormorantGaramond-600.woff2')}) format('woff2'); }
    @font-face { font-family: 'Cormorant Garamond'; font-weight: 600; font-style: italic; src: url(${staticFile('fonts/CormorantGaramond-600i.woff2')}) format('woff2'); }
    @font-face { font-family: 'Jost'; font-weight: 400 600; src: url(${staticFile('fonts/Jost-400.woff2')}) format('woff2'); }
  `}</style>
);

// Fondu d'entrée / sortie d'une scène (chevauchement de 12 images).
const useSceneFade = () => {
  const f = useCurrentFrame();
  return interpolate(f, [0, 12, SCENE, SCENE + 12], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
};

const Browser: React.FC<{ src: string; next?: string; switchAt?: number; zoom?: [number, number]; origin?: string; style?: React.CSSProperties }> = ({ src, next, switchAt = 999, zoom = [1, 1], origin = '20% 20%', style }) => {
  const f = useCurrentFrame();
  const z = interpolate(f, [0, SCENE], zoom, { extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad) });
  const mix = interpolate(f, [switchAt, switchAt + 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', borderRadius: 18, overflow: 'hidden', background: '#111', border: '1px solid #2a2723', boxShadow: '0 50px 120px rgba(0,0,0,.6), 0 0 0 1px rgba(212,175,55,.08)', ...style }}>
      <div style={{ height: 40, background: '#161616', display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', borderBottom: '1px solid #262626' }}>
        {['#ff5f57', '#febc2e', '#28c840'].map((c) => <span key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />)}
        <span style={{ marginLeft: 18, flex: 1, height: 24, borderRadius: 12, background: '#0d0d0d', color: '#8a857a', fontFamily: 'Jost', fontSize: 14, display: 'flex', alignItems: 'center', paddingLeft: 14 }}>karat.fit/tableau-de-bord</span>
      </div>
      <div style={{ position: 'relative', overflow: 'hidden', height: 'calc(100% - 40px)' }}>
        <Img src={cap(src)} style={{ width: '100%', transform: `scale(${z})`, transformOrigin: origin }} />
        {next && <Img src={cap(next)} style={{ position: 'absolute', inset: 0, width: '100%', opacity: mix, transform: `scale(${z})`, transformOrigin: origin }} />}
      </div>
    </div>
  );
};

const Phone: React.FC<{ srcs: string[]; every?: number; style?: React.CSSProperties; labels?: string[] }> = ({ srcs, every = 999, style, labels }) => {
  const f = useCurrentFrame();
  const i = Math.min(srcs.length - 1, Math.floor(f / every));
  const t = f - i * every;
  const prev = Math.max(0, i - 1);
  const mix = i === 0 ? 1 : interpolate(t, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', width: 340, height: 720, borderRadius: 52, background: '#0a0a0a', padding: 12, boxShadow: '0 0 0 2px #333, 0 0 0 6px #151515, 0 50px 100px rgba(0,0,0,.65)', ...style }}>
      <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 42, overflow: 'hidden', background: '#000' }}>
        {/* Barre d'état : la capture commence sous l'encoche, comme sur un vrai téléphone. */}
        <Img src={cap(srcs[prev])} style={{ position: 'absolute', top: 40, width: '100%' }} />
        <Img src={cap(srcs[i])} style={{ position: 'absolute', top: 40, width: '100%', opacity: mix }} />
        <div style={{ position: 'absolute', top: 10, left: '50%', marginLeft: -55, width: 110, height: 30, borderRadius: 16, background: '#000' }} />
      </div>
      {labels && (
        <div style={{ position: 'absolute', bottom: -64, left: 0, right: 0, textAlign: 'center' }}>
          <span style={{ fontFamily: 'Jost', fontSize: 22, fontWeight: 600, color: '#141414', background: GOLD_GRAD, padding: '8px 22px', borderRadius: 999 }}>{labels[mix > 0.5 ? i : prev]}</span>
        </div>
      )}
    </div>
  );
};

const Title: React.FC<{ kicker: string; title: React.ReactNode; sub?: string; style?: React.CSSProperties }> = ({ kicker, title, sub, style }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - 4, fps, config: { damping: 200 } });
  return (
    <div style={{ position: 'absolute', opacity: s, transform: `translateY(${(1 - s) * 30}px)`, ...style }}>
      <div style={{ fontFamily: 'Jost', fontSize: 20, letterSpacing: 6, color: GOLD, textTransform: 'uppercase', marginBottom: 14 }}>{kicker}</div>
      <div style={{ fontFamily: 'Cormorant Garamond', fontWeight: 600, fontSize: 68, lineHeight: 1.04, color: '#f4f1ea' }}>{title}</div>
      {sub && <div style={{ fontFamily: 'Jost', fontSize: 26, color: '#b7b2a6', marginTop: 18, maxWidth: 520, lineHeight: 1.4 }}>{sub}</div>}
    </div>
  );
};
const Gold: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontStyle: 'italic', background: GOLD_GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{children}</span>
);

const Toast: React.FC<{ at: number; text: string; amount: string }> = ({ at, text, amount }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - at, fps, config: { damping: 14, stiffness: 120 } });
  return (
    <div style={{ position: 'absolute', top: 70, right: 70, width: 470, display: 'flex', gap: 18, alignItems: 'center', padding: '18px 22px', borderRadius: 20, background: 'rgba(20,20,20,.94)', border: '1px solid rgba(245,215,126,.45)', boxShadow: '0 30px 70px rgba(0,0,0,.55)', opacity: Math.min(1, s * 1.4), transform: `translateY(${(1 - s) * -60}px)` }}>
      <div style={{ width: 54, height: 54, borderRadius: 14, background: GOLD_GRAD, display: 'grid', placeContent: 'center', fontSize: 28 }}>🔔</div>
      <div style={{ fontFamily: 'Jost', color: '#f4f1ea' }}>
        <div style={{ fontSize: 15, color: '#8a857a', letterSpacing: 1 }}>KARAT · maintenant</div>
        <div style={{ fontSize: 22, fontWeight: 600 }}>{text}</div>
        <div style={{ fontSize: 20, color: '#f5d77e' }}>{amount}</div>
      </div>
    </div>
  );
};

const Scene: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const o = useSceneFade();
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

export const KaratTour: React.FC = () => {
  const f = useCurrentFrame();
  const glow = 0.28 + 0.06 * Math.sin(f / 18);
  const loopFade = interpolate(f, [0, 10, TOUR_FRAMES - 10, TOUR_FRAMES], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const floatY = (k: number) => Math.sin((f + k) / 22) * 6;
  return (
    <AbsoluteFill style={{ background: '#0b0b0b', overflow: 'hidden' }}>
      <Fonts />
      <AbsoluteFill style={{ background: `radial-gradient(60% 55% at 70% 45%, rgba(212,175,55,${glow}), transparent 70%)` }} />
      <AbsoluteFill style={{ opacity: loopFade }}>
        {/* 1. La vitrine */}
        <Sequence from={0} durationInFrames={SCENE + 12}>
          <Scene>
            <Title kicker="Votre boutique en ligne" title={<>Une vitrine <Gold>élégante</Gold>,<br />prête à vendre</>} sub="Vos clients commandent depuis leur téléphone, et paient à la livraison." style={{ left: 90, top: 250 }} />
            <Phone srcs={['m_store_or-noir.jpg', 'm_store_or-noir_grid.jpg', 'm_product.jpg']} every={42} style={{ left: 1110, top: 130 + floatY(0) }} />
            <Phone srcs={['m_product.jpg']} style={{ left: 790, top: 210 + floatY(30), transform: 'scale(.86) rotate(-4deg)', opacity: 0.9 }} />
          </Scene>
        </Sequence>
        {/* 2. Les thèmes */}
        <Sequence from={SCENE} durationInFrames={SCENE + 12}>
          <Scene>
            <Title kicker="6 thèmes premium" title={<>Un design <Gold>à votre image</Gold></>} sub="Choisissez un thème, ajoutez votre logo et vos bannières : votre boutique est prête." style={{ left: 90, top: 280 }} />
            <Phone srcs={['m_store_or-noir.jpg', 'm_store_sahel.jpg', 'm_store_emeraude.jpg', 'm_store_ocean.jpg', 'm_store_rubis.jpg', 'm_store_ivoire.jpg']} every={20} labels={['Or Noir', 'Sahel', 'Émeraude', 'Océan', 'Rubis', 'Ivoire']} style={{ left: 1010, top: 120 + floatY(10) }} />
          </Scene>
        </Sequence>
        {/* 3. Le tableau de bord + commande en direct */}
        <Sequence from={SCENE * 2} durationInFrames={SCENE + 12}>
          <Scene>
            <Browser src="dash_overview.jpg" zoom={[1, 1.12]} origin="0% 0%" style={{ left: 90, top: 150, width: 1180, height: 790 }} />
            <Title kicker="Tableau de bord" title={<>Vos ventes <Gold>en direct</Gold></>} style={{ left: 1300, top: 520, transform: 'scale(.62)', transformOrigin: 'left top' }} />
            <Toast at={38} text="Nouvelle commande #KRT-10555" amount="3 200 MRU · Tevragh Zeina" />
          </Scene>
        </Sequence>
        {/* 4. Commandes et analyses, aussi sur mobile */}
        <Sequence from={SCENE * 3} durationInFrames={SCENE}>
          <Scene>
            <Browser src="dash_orders.jpg" next="dash_analytics.jpg" switchAt={58} zoom={[1.02, 1.08]} origin="40% 0%" style={{ left: 70, top: 130, width: 1140, height: 760 }} />
            <Phone srcs={['m_dash_overview.jpg']} style={{ left: 1190, top: 170 + floatY(40) }} />
            <div style={{ position: 'absolute', left: 70, top: 40, fontFamily: 'Jost', fontSize: 30, color: '#f4f1ea' }}>
              Commandes, stock, statistiques — <span style={{ color: '#f5d77e' }}>même sur votre téléphone</span>
            </div>
          </Scene>
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
