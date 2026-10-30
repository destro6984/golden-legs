import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home page", () => {
  const html = renderToStaticMarkup(<Home />);

  it("renders the getting-started heading", () => {
    expect(html).toContain("To get started, edit the");
  });

  it("links to the documentation in a new tab", () => {
    expect(html).toMatch(/<a[^>]*href="https:\/\/nextjs\.org\/docs[^"]*"[^>]*target="_blank"/);
  });

  it("renders the logos with alt text", () => {
    expect(html).toContain('alt="Next.js logo"');
    expect(html).toContain('alt="Vercel logomark"');
  });
});
