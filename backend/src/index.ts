import express from "express";
import cors from "cors";
import "dotenv/config";
import cookieParser from "cookie-parser";
import walletRoutes from "./routes/walletRoutes";
import { rpcConnection } from "./config";

const app = express();
app.use(express.json());

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const corsOptions = {
  origin: ["http://localhost:3000"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(cookieParser());

app.use("/api", walletRoutes);

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.listen(port, "0.0.0.0", async () => {
  const slot = await rpcConnection.getSlot();
  console.log("Latest slot:", slot);
  console.log(`Server running at http://0.0.0.0:${port}`);
});
