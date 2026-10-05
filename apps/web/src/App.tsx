import { MotionConfig } from "motion/react";
import { useEffect } from "react";
import { PreviewProvider } from "@/components/preview";
import { openScan, ScanHost } from "@/components/scan";
import { startSync, useSyncMode } from "@/data/sync";
import { useHaSyncLoop } from "@/lib/ha-sync";
import { GlobalSearch } from "@/components/search";
import { Toaster } from "@/components/ui/sonner";
import { query, replace, useRoute } from "@/lib/router";
import { useSelectedWeek } from "@/lib/ui";
import { NewRecipeView } from "@/views/new-recipe";
import { PantryView } from "@/views/pantry";
import { ProductView } from "@/views/product";
import { ProductsView } from "@/views/products";
import { FridgePrint, ShoppingPrint } from "@/views/print";
import { RecipeView } from "@/views/recipe";
import { RecipesView } from "@/views/recipes";
import { JoinView, Splash } from "@/views/join";
import { InstallView, SettingsView } from "@/views/settings";
import { ShoppingView } from "@/views/shopping";
import { TodayView } from "@/views/today";
import { ChooseView, WeekView } from "@/views/week";

function Routes() {
  const [section, a, b] = useRoute();
  const [week] = useSelectedWeek();
  switch (section) {
    case "semaine":
      return a === "imprimer" ? <FridgePrint weekStart={b ?? week} /> : a === "choix" ? <ChooseView entryId={b} /> : <WeekView />;
    case "courses":
      return a === "imprimer" ? <ShoppingPrint weekStart={b ?? week} /> : <ShoppingView add={a === "ajouter" ? (query().get("t") ?? "") : undefined} />;
    case "recettes":
      return a === "nouvelle" ? <NewRecipeView /> : a === "ingredient" ? <RecipesView ingredient={b} /> : a ? <RecipeView slug={a} /> : <RecipesView />;
    case "placard":
      return <PantryView key={a ?? ""} scan={a === "scanner"} />;
    case "produit":
      return a ? <ProductView key={a} code={a} /> : <ProductsView />;
    case "produits": {
      const q = query().get("q") ?? "";
      return <ProductsView key={q} q={q} />;
    }
    case "scanner":
      return <ScanShortcut />;
    case "reglages":
      return <SettingsView />;
    case "installer":
      return <InstallView />;
    default:
      return <TodayView />;
  }
}

/** Raccourci d'appli #/scanner : « Mes produits » en fond, le lecteur ouvert par-dessus (le retour ne le rouvre pas). */
function ScanShortcut() {
  useEffect(() => {
    replace("/produits");
    openScan("fiche");
  }, []);
  return null;
}

// Serveur du foyer ou vitrine ? Décidé une fois, au chargement.
void startSync();

export default function App() {
  // Vitrine : liste de courses partagée avec Home Assistant depuis le téléphone (le serveur s'en charge sinon).
  useHaSyncLoop();
  const mode = useSyncMode();
  return (
    <MotionConfig reducedMotion="user">
      {mode === "detecting" ? (
        <Splash />
      ) : mode === "join" ? (
        <JoinView />
      ) : (
        <PreviewProvider>
          <Routes />
        </PreviewProvider>
      )}
      <GlobalSearch />
      <ScanHost />
      <Toaster position="top-center" />
    </MotionConfig>
  );
}
