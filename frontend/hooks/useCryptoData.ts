"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchPrices, fetchChart, allCoinIds,
  type CoinPrice, type TimeRange,
} from "@/services/cryptoApi";

export interface CryptoState {
  prices: Record<string, CoinPrice>;
  pricesLoading: boolean;
  pricesError: string | null;
  chartData: [number, number][];
  chartLoading: boolean;
  chartError: string | null;
  selectedId: string | null;
  selectedRange: TimeRange;
  selectCoin: (id: string) => void;
  selectRange: (r: TimeRange) => void;
  refresh: () => void;
}

export function useCryptoData(): CryptoState {
  const [prices, setPrices] = useState<Record<string, CoinPrice>>({});
  const [pricesLoading, setPricesLoading] = useState(true);
  const [pricesError, setPricesError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>("bitcoin");
  const [selectedRange, setSelectedRange] = useState<TimeRange>("1W");
  const [chartData, setChartData] = useState<[number, number][]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load prices
  const loadPrices = useCallback(async () => {
    setPricesLoading(true);
    setPricesError(null);
    try {
      const data = await fetchPrices(allCoinIds());
      const map: Record<string, CoinPrice> = {};
      data.forEach((p) => { map[p.id] = p; });
      setPrices(map);
    } catch {
      setPricesError("Price data unavailable, try again later.");
    } finally {
      setPricesLoading(false);
    }
  }, []);

  // Load chart with debounce
  const loadChart = useCallback((id: string, range: TimeRange) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setChartLoading(true);
      setChartError(null);
      try {
        const data = await fetchChart(id, range);
        setChartData(data);
      } catch {
        setChartError("Chart data unavailable, try again later.");
      } finally {
        setChartLoading(false);
      }
    }, 300);
  }, []);

  // Initial load + auto-refresh every 60s
  useEffect(() => {
    loadPrices();
    const interval = setInterval(loadPrices, 60_000);
    return () => clearInterval(interval);
  }, [loadPrices]);

  // Load chart when selection changes
  useEffect(() => {
    if (selectedId) loadChart(selectedId, selectedRange);
  }, [selectedId, selectedRange, loadChart]);

  const selectCoin = useCallback((id: string) => setSelectedId(id), []);
  const selectRange = useCallback((r: TimeRange) => setSelectedRange(r), []);

  return {
    prices, pricesLoading, pricesError,
    chartData, chartLoading, chartError,
    selectedId, selectedRange,
    selectCoin, selectRange,
    refresh: loadPrices,
  };
}
