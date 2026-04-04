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
  const [selectedRange, setSelectedRange] = useState<TimeRange>("1M");
  const [chartData, setChartData] = useState<[number, number][]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  // Track whether the initial parallel load has already fired
  const initialLoadDone = useRef(false);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const loadPrices = useCallback(async () => {
    setPricesLoading(true);
    setPricesError(null);
    try {
      const data = await fetchPrices(allCoinIds());
      if (!mountedRef.current) return;
      const map: Record<string, CoinPrice> = {};
      data.forEach((p) => { map[p.id] = p; });
      setPrices(map);
    } catch {
      if (!mountedRef.current) return;
      setPricesError("Unable to load crypto prices. Try again later.");
    } finally {
      if (mountedRef.current) setPricesLoading(false);
    }
  }, []);

  const loadChart = useCallback(async (id: string, range: TimeRange) => {
    if (!mountedRef.current) return;
    setChartLoading(true);
    setChartError(null);
    try {
      const data = await fetchChart(id, range);
      if (!mountedRef.current) return;
      // Always set data — even empty array stops the spinner
      setChartData(data);
    } catch {
      if (!mountedRef.current) return;
      setChartError("Chart data unavailable. Try again later.");
      setChartData([]);
    } finally {
      if (mountedRef.current) setChartLoading(false);
    }
  }, []);

  const debouncedLoadChart = useCallback((id: string, range: TimeRange) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadChart(id, range), 80);
  }, [loadChart]);

  // Initial load — prices and chart fire in parallel, exactly once
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;
    loadPrices();
    loadChart("bitcoin", "1M");
    const interval = setInterval(loadPrices, 60_000);
    return () => clearInterval(interval);
  }, [loadPrices, loadChart]);

  // Reload chart when user changes coin or range
  const prevSelectionRef = useRef({ id: "bitcoin", range: "1M" as TimeRange });
  useEffect(() => {
    const prev = prevSelectionRef.current;
    if (!selectedId) return;
    // Skip if nothing actually changed
    if (prev.id === selectedId && prev.range === selectedRange) return;
    prevSelectionRef.current = { id: selectedId, range: selectedRange };
    debouncedLoadChart(selectedId, selectedRange);
  }, [selectedId, selectedRange, debouncedLoadChart]);

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
