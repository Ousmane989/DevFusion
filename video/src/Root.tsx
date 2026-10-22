import React from 'react';
import { Composition } from 'remotion';
import { KaratTour, TOUR_FRAMES } from './KaratTour';

export const Root: React.FC = () => (
  <>
    {/* Visite guidée du site vitrine : vraies captures de la plateforme, boucle de 16 s. */}
    <Composition id="KaratTour" component={KaratTour} durationInFrames={TOUR_FRAMES} fps={30} width={1600} height={1000} />
  </>
);
