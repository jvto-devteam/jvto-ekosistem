import { createClient } from "tinacms/dist/client";
import { queries } from "./types.js";
export const client = createClient({ cacheDir: '/Users/macbook/Code/jvto-ekosistem/tina/__generated__/.cache/1786523771149', url: 'http://localhost:4001/graphql', token: 'null', queries,  });
export default client;
  