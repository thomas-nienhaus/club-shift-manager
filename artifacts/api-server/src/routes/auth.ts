import { Router, type IRouter } from "express";
import { LoginBody, UpdateMyProfileBody } from "@workspace/api-zod";
import { db, volunteersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

const router: IRouter = Router();

function verifyPassword(plain: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    const hashBuf = Buffer.from(hash, "hex");
    const derived = scryptSync(plain, salt, 64);
    return timingSafeEqual(hashBuf, derived);
  } catch {
    return false;
  }
}

function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

router.post("/login", async (req, res) => {
  const body = LoginBody.parse(req.body);

  const emailInput = body.email ?? body.username;
  if (!emailInput) {
    res.status(400).json({ error: "Voer je e-mailadres in." });
    return;
  }

  const email = emailInput.trim().toLowerCase();
  const [volunteer] = await db
    .select()
    .from(volunteersTable)
    .where(eq(volunteersTable.email, email));

  if (!volunteer) {
    res.status(401).json({ error: "E-mailadres niet gevonden. Vraag de beheerder om je toe te voegen." });
    return;
  }

  if (volunteer.passwordHash) {
    if (!body.password) {
      res.status(401).json({ error: "Voer je wachtwoord in." });
      return;
    }
    if (!verifyPassword(body.password, volunteer.passwordHash)) {
      res.status(401).json({ error: "Onjuist wachtwoord." });
      return;
    }
  }

  const role = volunteer.isAdmin ? "admin" : "volunteer";

  req.session = req.session || {};
  (req.session as any).user = {
    role,
    username: volunteer.email,
    volunteerId: volunteer.id,
    volunteerName: volunteer.name,
  };

  res.json({ role, message: `Ingelogd als ${volunteer.name}` });
});

router.get("/me", (req, res) => {
  const session = req.session as any;
  if (!session?.user) {
    res.status(401).json({ error: "Niet ingelogd" });
    return;
  }
  const { role, username, volunteerId, volunteerName } = session.user;
  res.json({ role, username, ...(volunteerId ? { volunteerId, volunteerName } : {}) });
});

router.patch("/profile", async (req, res) => {
  const session = req.session as any;
  if (!session?.user?.volunteerId) {
    res.status(401).json({ error: "Niet ingelogd of geen vrijwilligersaccount." });
    return;
  }

  const { name, email, phone, password } = UpdateMyProfileBody.parse(req.body);
  const volunteerId: number = session.user.volunteerId;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email ?? null;
  if (phone !== undefined) updates.phone = phone ?? null;
  if (password) updates.passwordHash = hashPassword(password);

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Geen wijzigingen opgegeven." });
    return;
  }

  const [updated] = await db
    .update(volunteersTable)
    .set(updates)
    .where(eq(volunteersTable.id, volunteerId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Vrijwilliger niet gevonden." });
    return;
  }

  // Update session name if changed
  if (name) session.user.volunteerName = updated.name;
  if (email) session.user.username = updated.email;

  const { passwordHash: _omit, ...safe } = updated;
  res.json({ ...safe, hasPassword: !!updated.passwordHash, createdAt: updated.createdAt.toISOString() });
});

router.post("/logout", (req, res) => {
  const session = req.session as any;
  if (session) {
    (req as any).session = null;
  }
  res.json({ success: true, message: "Uitgelogd" });
});

export default router;
