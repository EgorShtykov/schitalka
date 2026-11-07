import { describe, expect, it } from "vitest";
import { hasValidFileSignature, homeworkFilePath } from "./homework-storage";

describe("homework file safety", () => {
  it("accepts matching PNG and PDF signatures", () => {
    expect(hasValidFileSignature("image/png", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]))).toBe(true);
    expect(hasValidFileSignature("application/pdf", new TextEncoder().encode("%PDF-1.7"))).toBe(true);
  });

  it("rejects a file whose contents do not match its declared type", () => {
    expect(hasValidFileSignature("image/png", new TextEncoder().encode("%PDF-1.7"))).toBe(false);
    expect(hasValidFileSignature("application/pdf", new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
  });

  it("rejects unsupported types and malformed WebP files", () => {
    expect(hasValidFileSignature("text/html", new TextEncoder().encode("<html>"))).toBe(false);
    expect(hasValidFileSignature("image/webp", new TextEncoder().encode("RIFFxxxxNOPE"))).toBe(false);
  });

  it("allows only generated storage names, never paths from a request", () => {
    expect(homeworkFilePath("123e4567-e89b-42d3-a456-426614174000.pdf").endsWith("123e4567-e89b-42d3-a456-426614174000.pdf")).toBe(true);
    expect(() => homeworkFilePath("../../secret.pdf")).toThrow("Invalid storage name");
    expect(() => homeworkFilePath("uploaded.html")).toThrow("Invalid storage name");
  });
});
