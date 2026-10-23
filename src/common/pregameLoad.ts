import { makeAutoObservable } from 'mobx';

/** State shared by the pre-game page and its menu music. */
class PregameLoad {
  /** The worlds card is open: the loading is over and the menu music may start. */
  worldsOpen = false;

  constructor() {
    makeAutoObservable(this);
  }

  setWorldsOpen(value: boolean): void {
    this.worldsOpen = value;
  }
}

export const pregameLoad = new PregameLoad();
