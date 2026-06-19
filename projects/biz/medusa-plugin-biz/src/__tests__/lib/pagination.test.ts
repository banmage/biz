import { parsePagination, paginatedResponse } from "../../lib/pagination";

describe("parsePagination", () => {
  test("should return default values when no arguments are provided", () => {
    const result = parsePagination({});
    expect(result).toEqual({ limit: 20, offset: 0 });
  });

  test("should parse custom limit and offset", () => {
    const result = parsePagination({ limit: 50, offset: 10 });
    expect(result).toEqual({ limit: 50, offset: 10 });
  });

  test("should cap limit at MAX_LIMIT (100) when exceeding it", () => {
    const result = parsePagination({ limit: 200, offset: 0 });
    expect(result).toEqual({ limit: 100, offset: 0 });
  });

  test("should use default limit when limit is 0 or negative", () => {
    // limit = 0
    expect(parsePagination({ limit: 0, offset: 5 })).toEqual({
      limit: 20,
      offset: 5,
    });

    // limit = -5
    expect(parsePagination({ limit: -5, offset: 5 })).toEqual({
      limit: 20,
      offset: 5,
    });
  });

  test("should use default offset when offset is negative", () => {
    const result = parsePagination({ limit: 10, offset: -3 });
    expect(result).toEqual({ limit: 10, offset: 0 });
  });

  test("should handle string parameters", () => {
    const result = parsePagination({ limit: "50", offset: "10" });
    expect(result).toEqual({ limit: 50, offset: 10 });
  });

  test("should use default limit when string limit is not a valid number", () => {
    const result = parsePagination({ limit: "abc", offset: "10" });
    expect(result).toEqual({ limit: 20, offset: 10 });
  });

  test("should cap string limit at MAX_LIMIT (100)", () => {
    const result = parsePagination({ limit: "200", offset: "0" });
    expect(result).toEqual({ limit: 100, offset: 0 });
  });

  test("should use default values for undefined fields", () => {
    const result = parsePagination({ limit: undefined, offset: undefined });
    expect(result).toEqual({ limit: 20, offset: 0 });
  });
});

describe("paginatedResponse", () => {
  test("should return correct structure with rows, total, limit, and offset", () => {
    const data = [{ id: 1 }, { id: 2 }];
    const result = paginatedResponse(data, 100, { limit: 20, offset: 0 });

    expect(result).toEqual({
      rows: [{ id: 1 }, { id: 2 }],
      total: 100,
      limit: 20,
      offset: 0,
    });
  });

  test("should work with custom limit and offset", () => {
    const data = [{ name: "a" }];
    const result = paginatedResponse(data, 1, { limit: 10, offset: 30 });

    expect(result).toEqual({
      rows: [{ name: "a" }],
      total: 1,
      limit: 10,
      offset: 30,
    });
  });

  test("should handle empty rows array", () => {
    const result = paginatedResponse([], 0, { limit: 20, offset: 0 });

    expect(result).toEqual({
      rows: [],
      total: 0,
      limit: 20,
      offset: 0,
    });
  });
});
