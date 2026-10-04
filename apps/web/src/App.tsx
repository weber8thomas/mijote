import { MotionConfig } from "motion/react";
import { PreviewProvider } from "@/components/preview";
import { GlobalSearch } from "@/components/search";
import { Toaster } from "@/components/ui/sonner";
import { useRoute } from "@/lib/router";
import { useSelectedWeek } from "@/lib/ui";
import { NewRecipeView } from "@/views/new-recipe";
import { FridgePrint, ShoppingPrint } from "@/views/print";
import { RecipeView } from "@/views/recipe";
import { RecipesView } from "@/views/recipes";
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
      return a === "imprimer" ? <ShoppingPrint weekStart={b ?? week} /> : <ShoppingView />;
    case "recettes":
      return a === "nouvelle" ? <NewRecipeView /> : a === "ingredient" ? <RecipesView ingredient={b} /> : a ? <RecipeView slug={a} /> : <RecipesView />;
    case "reglages":
      return <SettingsView />;
    case "installer":
      return <InstallView />;
    default:
      return <TodayView />;
  }
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <PreviewProvider>
        <Routes />
      </PreviewProvider>
      <GlobalSearch />
      <Toaster position="top-center" />
    </MotionConfig>
  );
}
