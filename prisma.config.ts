
import "dotenv/config";

import { definePrismaConfig } from "prisma/config";
import { defineConfig as ormConfig } from "@prisma/orm-postgres/config";

export default definePrismaConfig({
  parent: false,

  skills: {
    agents: ["claude", "cursor", "agents", "devin"],
  },

  orm: ormConfig({
    contract: "./prisma/contract.prisma",

    db: {
      connection: process.env["DIRECT_URL"]!,
    },
  }),
});
