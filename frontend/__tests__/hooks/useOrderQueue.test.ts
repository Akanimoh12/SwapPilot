import { renderHook } from "@testing-library/react";

// Mock wagmi hooks
const mockUseReadContract = jest.fn();
jest.mock("wagmi", () => ({
  useReadContract: (config: unknown) => mockUseReadContract(config),
}));

jest.mock("@/lib/contracts", () => ({
  SWAPPILOT_HOOK: {
    address: "0x0000000000000000000000000000000000000001",
    abi: [],
  },
}));

import { useOrderQueue, useSortedOrders } from "@/hooks/useOrderQueue";

const POOL_ID =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

describe("useOrderQueue", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns an array structure with orderIds, isLoading, error, refetch", () => {
    const mockRefetch = jest.fn();
    mockUseReadContract.mockReturnValue({
      data: 3n,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useOrderQueue(POOL_ID));

    expect(result.current).toHaveProperty("orderIds");
    expect(result.current).toHaveProperty("isLoading");
    expect(result.current).toHaveProperty("error");
    expect(result.current).toHaveProperty("refetch");
    expect(Array.isArray(result.current.orderIds)).toBe(true);
  });

  it("returns loading state when contract read is loading", () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useOrderQueue(POOL_ID));
    expect(result.current.isLoading).toBe(true);
  });

  it("returns error when contract read fails", () => {
    const mockError = new Error("RPC error");
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: mockError,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useOrderQueue(POOL_ID));
    expect(result.current.error).toEqual(mockError);
  });

  it("calls useReadContract with getQueueLength and 5s polling", () => {
    mockUseReadContract.mockReturnValue({
      data: 0n,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    renderHook(() => useOrderQueue(POOL_ID));

    expect(mockUseReadContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: "getQueueLength",
        query: expect.objectContaining({
          refetchInterval: 5_000,
        }),
      }),
    );
  });

  it("provides a refetch function", () => {
    const mockRefetch = jest.fn();
    mockUseReadContract.mockReturnValue({
      data: 5n,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useOrderQueue(POOL_ID));
    expect(result.current.refetch).toBe(mockRefetch);
  });
});

describe("useSortedOrders", () => {
  it("sorts order IDs newest first (descending)", () => {
    const ids = [0n, 1n, 2n, 3n, 4n];
    const { result } = renderHook(() => useSortedOrders(ids));

    expect(result.current).toEqual([4n, 3n, 2n, 1n, 0n]);
  });

  it("returns empty array for empty input", () => {
    const { result } = renderHook(() => useSortedOrders([]));
    expect(result.current).toEqual([]);
  });

  it("does not mutate the original array", () => {
    const ids = [2n, 0n, 1n];
    const original = [...ids];
    renderHook(() => useSortedOrders(ids));
    expect(ids).toEqual(original);
  });
});
