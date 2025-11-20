import { Hono } from "hono";
import {
  getLinkBuilds,
  getLinkBuild,
  addLinkBuild,
  editLinkBuild,
  getLinkBuildsByClient,
  getLinkBuildsByTechnician,
  deleteLinkBuild,
  getLinkBuildWeeklyTotals,
} from "../controllers/linkBuild";

const linkBuild = new Hono();

linkBuild.get("/", getLinkBuilds);
linkBuild.get("/:id", getLinkBuild);
linkBuild.get("/client/:clientName", getLinkBuildsByClient);
linkBuild.get("/technician/:technicianName", getLinkBuildsByTechnician);

linkBuild.post("/", addLinkBuild);
linkBuild.put("/", editLinkBuild);
linkBuild.post("/weekly-totals", getLinkBuildWeeklyTotals);

// Delete a link-build order by id
linkBuild.delete("/:id", deleteLinkBuild);

export default linkBuild;
