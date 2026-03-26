import path from "path";
import { fileURLToPath } from "url";
import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./routes";

const app: Express = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.SESSION_SECRET || "kantine-secret-key"));

app.use((req, _res, next) => {
  const cookieData = req.signedCookies?.session;
  if (cookieData) {
    try {
      (req as any).session = JSON.parse(cookieData);
    } catch {
      (req as any).session = {};
    }
  } else {
    (req as any).session = {};
  }
  next();
});

app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = function (data) {
    const session = (req as any).session;
    if (session === null) {
      res.clearCookie("session");
    } else if (session && Object.keys(session).length > 0) {
      res.cookie("session", JSON.stringify(session), {
        signed: true,
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: "lax",
      });
    }
    return originalJson(data);
  };
  next();
});

app.use("/api", router);

if (process.env.NODE_ENV === "production") {
  const distPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../artifacts/kantine-planner/dist/public",
  );
  app.use(express.static(distPath));
  app.use((_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

export default app;
