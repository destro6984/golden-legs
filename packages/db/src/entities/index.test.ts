import { describe, expect, it } from "vitest";
import { entities } from "./index";

describe("entities", () => {
  it("is the registry passed to MikroORM, empty until the first concept", () => {
    expect(entities).toEqual([]);
  });
});
