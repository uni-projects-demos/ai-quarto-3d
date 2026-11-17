import type { JSX } from "react";
import { GameInfo } from "./ui/game/GameInfo";
import { GameScreen } from "./ui/game/GameScreen";
import { LanguageDialog } from "./ui/i18n/LanguageDialog";

export default function App(): JSX.Element {
  return (
    <>
      <main id="game-layout" className="game-layout">
        <GameScreen />
        <GameInfo />
      </main>
      <LanguageDialog />
    </>
  );
}
