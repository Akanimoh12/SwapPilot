import { renderHook } from "@testing-library/react";

// Mock wagmi hooks
const mockUseReadContract = jest.fn();
const mockUseWriteContract = jest.fn();
const mockUseWaitForTransactionReceipt = jest.fn();

jest.mock("wagmi", () => ({
  useReadContract: (config: unknown) => mockUseReadContract(config),
  useWriteContract: () => mockUseWriteContract(),
  useWaitForTransactionReceipt: (config: unknown) =>
    mockUseWaitForTransactionReceipt(config),
}));

jest.mock("@/lib/contracts", () => ({
  SWAPPILOT_HOOK: {
    address: "0x0000000000000000000000000000000000000001",
    abi: [],
  },
}));

import {
  useQueueLength,
  useOrder,
  useTotalOrdersQueued,
  useTotalOrdersExecuted,
  useExpireOrder,
} from "@/hooks/useSwapPilot";

describe("useSwapPilot hooks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("useQueueLength", () => {
    it("returns a number from contract read", () => {
      mockUseReadContract.mockReturnValue({
        data: 5n,
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() =>
        useQueueLength("0x0000000000000000000000000000000000000000000000000000000000000000"),
      );

      expect(result.current.data).toBe(5n);
      expect(result.current.isLoading).toBe(false);
    });

    it("calls useReadContract with getQueueLength function", () => {
      mockUseReadContract.mockReturnValue({
        data: 0n,
        isLoading: false,
        error: null,
      });

      renderHook(() =>
        useQueueLength("0x0000000000000000000000000000000000000000000000000000000000000000"),
      );

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: "getQueueLength",
        }),
      );
    });
  });

  describe("useOrder", () => {
    const POOL_ID = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

    it("returns an order object from contract read", () => {
      const mockOrder = {
        trader: "0x1234567890abcdef1234567890abcdef12345678",
        poolKey: {
          currency0: "0x0000000000000000000000000000000000000000",
          currency1: "0x0000000000000000000000000000000001000000",
          fee: 3000,
          tickSpacing: 60,
          hooks: "0x0000000000000000000000000000000000000001",
        },
        params: {
          zeroForOne: true,
          amountSpecified: 1000000000000000000n,
          sqrtPriceLimitX96: 4295128740n,
        },
        queuedAt: 1700000000n,
        amountQueued: 1000000000000000000n,
        zeroForOne: true,
        status: 0,
      };

      mockUseReadContract.mockReturnValue({
        data: mockOrder,
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useOrder(POOL_ID, 0n));

      expect(result.current.data).toEqual(mockOrder);
      expect(result.current.isLoading).toBe(false);
    });

    it("calls useReadContract with getOrder function and poolId + orderIndex args", () => {
      mockUseReadContract.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      renderHook(() => useOrder(POOL_ID, 42n));

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: "getOrder",
          args: [POOL_ID, 42n],
        }),
      );
    });
  });

  describe("useTotalOrdersQueued", () => {
    it("returns total queued count", () => {
      mockUseReadContract.mockReturnValue({
        data: 25n,
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useTotalOrdersQueued());
      expect(result.current.data).toBe(25n);
    });

    it("reads totalOrdersQueued with refetchInterval", () => {
      mockUseReadContract.mockReturnValue({
        data: 0n,
        isLoading: false,
        error: null,
      });

      renderHook(() => useTotalOrdersQueued());

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: "totalOrdersQueued",
          query: expect.objectContaining({
            refetchInterval: 10_000,
          }),
        }),
      );
    });
  });

  describe("useTotalOrdersExecuted", () => {
    it("returns total executed count", () => {
      mockUseReadContract.mockReturnValue({
        data: 10n,
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useTotalOrdersExecuted());
      expect(result.current.data).toBe(10n);
    });
  });

  describe("useExpireOrder", () => {
    it("returns write function and transaction state", () => {
      const mockWriteContract = jest.fn();
      mockUseWriteContract.mockReturnValue({
        writeContract: mockWriteContract,
        data: undefined,
        isPending: false,
        isSuccess: false,
        error: null,
      });

      mockUseWaitForTransactionReceipt.mockReturnValue({
        isLoading: false,
        isSuccess: false,
      });

      const { result } = renderHook(() => useExpireOrder());

      expect(result.current.write).toBeDefined();
      expect(result.current.isPending).toBe(false);
      expect(result.current.isConfirmed).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});
