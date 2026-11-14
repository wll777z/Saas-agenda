import React from "react";
import { renderToString } from "react-dom/server";
import Landing from "../src/components/Landing";
process.stdout.write(renderToString(<Landing />));
