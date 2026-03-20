import { Router, type IRouter } from "express";
import healthRouter from "./health";
import volunteersRouter from "./volunteers";
import shiftsRouter from "./shifts";
import authRouter from "./auth";
import seasonsRouter from "./seasons";
import autoScheduleRouter from "./auto-schedule";
import availabilitySlotsRouter from "./availability-slots";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/seasons", seasonsRouter);
router.use("/volunteers", volunteersRouter);
router.use("/shifts/auto-schedule", autoScheduleRouter);
router.use("/shifts", shiftsRouter);
router.use("/availability-slots", availabilitySlotsRouter);
router.use("/auth", authRouter);

export default router;
