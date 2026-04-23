import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/auth-context";

// Pages
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Volunteers from "@/pages/volunteers";
import Seasons from "@/pages/seasons";
import Login from "@/pages/login";
import AvailabilitySlots from "@/pages/availability-slots";
import Settings from "@/pages/settings";
import SetPassword from "@/pages/set-password";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={Dashboard} />
      <Route path="/seasons" component={Seasons} />
      <Route path="/volunteers" component={Volunteers} />
      <Route path="/availability-slots" component={AvailabilitySlots} />
      <Route path="/settings" component={Settings} />
      <Route path="/set-password" component={SetPassword} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
