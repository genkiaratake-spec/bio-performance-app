import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import BottomNav from "./components/BottomNav";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Analysis from "./pages/Analysis";
import MealPlan from "./pages/MealPlan";
import Supplements from "./pages/Supplements";
import FoodScanner from "./pages/FoodScanner";

const BOTTOM_NAV_ROUTES = ["/", "/analysis", "/upload", "/supplements"];

function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const showBottomNav = BOTTOM_NAV_ROUTES.includes(location);
  return (
    <>
      {children}
      {showBottomNav && <BottomNav />}
    </>
  );
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/upload" component={Upload} />
        <Route path="/analysis" component={Analysis} />
        <Route path="/meal-plan" component={MealPlan} />
        <Route path="/supplements" component={Supplements} />
        <Route path="/food-scanner" component={FoodScanner} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
