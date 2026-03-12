export interface Position {
  x: number;
  y: number;
}

export interface WormState {
  id: string;
  playerId: string;
  position: Position;
  alive: boolean;
  facingRight: boolean;
}

export interface DamageEvent {
  position: Position;
  radius: number;
}

export interface GameState {
  seed: number;
  worms: WormState[];
  damageLog: DamageEvent[];
  currentTurn: number;
  activePlayerId: string | null;
}
