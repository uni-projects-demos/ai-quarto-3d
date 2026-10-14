import type { JSX } from "react";
import { GameInfo } from "./ui/GameInfo";
import { GameScreen } from "./ui/GameScreen";
import { LanguageDialog } from "./ui/LanguageDialog";

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
