import Home from "./routes/Home.svelte";
import { wrap } from "svelte-spa-router/wrap";
import NotFound from "./routes/NotFound.svelte";

export const routes = {
  "/": Home,
  "/modeller": Home,
  "/lokomotif": wrap({ asyncComponent: () => import("./routes/Locomotive.svelte") }),
  "/kilavuz": wrap({ asyncComponent: () => import("./routes/Guide.svelte") }),
  "/tasarla": wrap({ asyncComponent: () => import("./routes/Designer.svelte") }),
  "/parcalar": wrap({ asyncComponent: () => import("./routes/Parts.svelte") }),
  "*": NotFound,
};
