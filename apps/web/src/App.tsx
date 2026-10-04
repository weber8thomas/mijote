import { MotionConfig } from "motion/react";
import { WatercolorDefs } from "@/components/illustrations";
import { PreviewProvider } from "@/components/preview";
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
import { WeekView } from "@/views/week";

function Routes() {
  const [section, a, b] = useRoute();
  const [week] = useSelectedWeek();
  switch (section) {
    case "semaine":
      return a === "imprimer" ? <FridgePrint weekStart={b ?? week} /> : <WeekView />;
    case "courses":
      return a === "imprimer" ? <ShoppingPrint weekStart={b ?? week} /> : <ShoppingView />;
    case "recettes":
      return a === "nouvelle" ? <NewRecipeView /> : a ? <RecipeView slug={a} /> : <RecipesView />;
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
      <WatercolorDefs />
      <PreviewProvider>
        <Routes />
      </PreviewProvider>
      <Toaster position="top-center" />
    </MotionConfig>
  );
}
