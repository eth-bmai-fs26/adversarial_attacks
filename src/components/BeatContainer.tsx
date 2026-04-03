import type { ReactNode } from 'react';

interface BeatContainerProps {
  currentBeat: string | number;
  isTransitioning: boolean;
  children: ReactNode;
}

export default function BeatContainer({ isTransitioning, children }: BeatContainerProps) {
  return (
    <div
      className="flex-1 flex items-center justify-center w-full"
      style={{
        opacity: isTransitioning ? 0 : 1,
        transition: 'opacity 400ms ease-in-out',
        pointerEvents: isTransitioning ? 'none' : 'auto',
      }}
    >
      {children}
    </div>
  );
}
