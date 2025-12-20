import { createClient } from "@sanity/client";

const client = createClient({
  projectId: "6go5cl4m",
  dataset: "production",
  apiVersion: "2023-05-30",
  useCdn: false,
});

export default client;
