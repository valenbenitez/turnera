"use client";

import { getAuth } from "firebase/auth";

import { app } from "@/lib/firebase/config";

/** Auth del SDK cliente; usar solo en componentes/páginas `"use client"`. */
export const auth = getAuth(app);
