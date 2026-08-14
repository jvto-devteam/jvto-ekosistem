import assert from "node:assert/strict";
import { composeGraph } from "../lib/schema-contract.mjs";

{
  const nodes = [
    { "@id": "https://x/#organization", "@type": "Organization", name: "First" },
    { "@id": "https://x/#organization", "@type": "Organization", name: "Duplicate" },
    { "@id": "https://x/#webpage", "@type": "WebPage", name: "Page" },
  ];
  const graph = composeGraph(nodes);
  assert.equal(graph["@context"], "https://schema.org");
  assert.equal(graph["@graph"].length, 2);
  assert.equal(graph["@graph"][0].name, "First");
}

{
  const nodes = [{ "@type": "Organization", name: "No id" }];
  assert.throws(() => composeGraph(nodes), /schema-contract:.*@id/);
}

{
  const nodes = [
    { "@id": "https://x/#organization", "@type": "Organization" },
    { "@id": "https://x/#organization-2", "@type": "TravelAgency" },
  ];
  assert.throws(() => composeGraph(nodes), /schema-contract:.*Organization/);
}

{
  const nodes = [
    { "@id": "https://x/#faq", "@type": "FAQPage" },
    { "@id": "https://x/#faq-2", "@type": "FAQPage" },
  ];
  assert.throws(() => composeGraph(nodes), /schema-contract:.*FAQPage/);
}

{
  const nodes = [
    { "@id": "https://x/#webpage", "@type": "WebPage" },
    { "@id": "https://x/#webpage-2", "@type": "ProfilePage" },
  ];
  assert.throws(() => composeGraph(nodes), /schema-contract:.*WebPage/);
}

{
  const nodes = [{ "@id": "https://x/#doc", "@type": ["Person", "Physician"] }];
  const graph = composeGraph(nodes);
  assert.equal(graph["@graph"].length, 1);
}

console.log("schema-contract.test.mjs: all assertions passed");
