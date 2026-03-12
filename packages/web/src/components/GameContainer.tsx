import { useEffect, useRef } from 'react';
import { startGame, destroyGame } from '@worms/game';

export function GameContainer() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    startGame(containerRef.current);
    return () => destroyGame();
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}
