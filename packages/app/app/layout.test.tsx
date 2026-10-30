import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import RootLayout, { metadata } from "./layout";

vi.mock("@golden-legs/db", () => ({ getOrm: vi.fn(), pingDatabase: vi.fn() }));
vi.mock("next/font/google", () => ({
  Geist: (options: { variable: string }) => ({ variable: `font-var${options.variable}` }),
  Geist_Mono: (options: { variable: string }) => ({ variable: `font-var${options.variable}` }),
}));

describe("RootLayout", () => {
  it("uses the app name as the page title", () => {
    expect(metadata.title).toBe("GoldenLegs");
  });

  it("sets the language and the font variables the theme reads", () => {
    const html = renderToStaticMarkup(<RootLayout params={Promise.resolve({})}>page</RootLayout>);

    expect(html).toMatch(/<html lang="en" class="[^"]*font-var--font-sans[^"]*font-var--font-geist-mono/);
  });

  it("renders its children inside the body", () => {
    const html = renderToStaticMarkup(
      <RootLayout params={Promise.resolve({})}>
        <p>child content</p>
      </RootLayout>,
    );

    expect(html).toContain("<p>child content</p>");
  });
});
