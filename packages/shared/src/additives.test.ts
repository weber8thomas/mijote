import { describe, expect, it } from "vitest";
import { additiveInfo, sortAdditives, worstRisk } from "./additives";

describe("additifs par nocivité", () => {
  it("classe du plus au moins préoccupant", () => {
    const sorted = sortAdditives(["E330", "E322i", "E250", "E960", "E202", "E999999"]);
    expect(sorted.map((a) => [a.code, a.risk])).toEqual([
      ["E202", "high"],
      ["E250", "high"],
      ["E960", "moderate"],
      ["E322i", "none"],
      ["E330", "none"],
      ["E999999", "unknown"],
    ]);
  });

  it("mesures réglementaires : dioxyde de titane, colorants « Southampton »", () => {
    expect(additiveInfo("E171")).toMatchObject({ risk: "high", name: "Oxyde de titane" });
    expect(additiveInfo("e129").reasons[0]).toMatch(/attention des enfants/);
  });

  it("dit pourquoi, bébé compris", () => {
    const nitrite = additiveInfo("E250");
    expect(nitrite.name).toBe("Nitrite de sodium");
    expect(nitrite.classes).toContain("Conservateur");
    expect(nitrite.reasons.join(" ")).toMatch(/tout-petits/);
    expect(additiveInfo("E955").reasons).toContain("Édulcorant : interdit dans les aliments pour bébés.");
    expect(additiveInfo("E330").reasons).toEqual(["Aucun risque identifié par l'EFSA ni l'ANSES."]);
  });

  it("une variante hérite de sa famille, sans doublon", () => {
    expect(additiveInfo("E407a").risk).toBe("high");
    expect(sortAdditives(["E330", "e330"])).toHaveLength(1);
    expect(worstRisk([])).toBeUndefined();
    expect(worstRisk(["E330", "E407"])).toBe("high");
  });
});
